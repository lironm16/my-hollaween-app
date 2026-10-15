import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  formatHouseAccessCode,
  hashNightPassToken,
  HOUSE_ACCESS_MAX_DEVICES,
  newHouseAccessCode,
  passIdForCode,
} from "@/lib/night-pass-codes";
import {
  deleteNightPass,
  listHouseNightPasses,
  readNightPass,
  updateNightPass,
  type HouseAccessSession,
  type NightPassEvent,
  type NightPassRecord,
} from "@/lib/night-pass-store";

const HISTORY_MAX = 20;

function withEvent(history: NightPassEvent[], event: NightPassEvent) {
  return [...history, event].slice(-HISTORY_MAX);
}

export function isUnifiedHouseAccess(record: NightPassRecord): boolean {
  return record.model === "unified" || Array.isArray(record.sessions);
}

function sessionTokenMatches(session: HouseAccessSession, token: string) {
  const expected = Buffer.from(session.tokenHash);
  const got = Buffer.from(hashNightPassToken(token));
  return expected.length === got.length && timingSafeEqual(expected, got);
}

function sortSessions(sessions: HouseAccessSession[]) {
  return [...sessions].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
}

async function createUnifiedPass(
  houseId: string,
  carry?: Pick<NightPassRecord, "resetCount" | "history">,
  preferredCode?: string,
): Promise<NightPassRecord> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = preferredCode ?? newHouseAccessCode();
    const id = passIdForCode(code);
    const now = new Date().toISOString();
    const record: NightPassRecord = {
      id,
      houseId,
      model: "unified",
      sessions: [],
      code,
      resetCount: carry?.resetCount ?? 0,
      history: carry?.history ?? [],
      createdAt: now,
      updatedAt: now,
    };
    let created = false;
    await updateNightPass(id, (current) => {
      if (current) return null;
      created = true;
      return record;
    });
    if (created) return record;
    preferredCode = undefined;
  }
  throw new Error("HOUSE_ACCESS_CODE_COLLISION");
}

async function migrateLegacyPasses(houseId: string, rows: NightPassRecord[]): Promise<NightPassRecord> {
  const sessions: HouseAccessSession[] = [];
  let history: NightPassEvent[] = [];
  let resetCount = 0;
  for (const row of rows) {
    resetCount = Math.max(resetCount, row.resetCount ?? 0);
    history = [...history, ...(row.history ?? [])].slice(-HISTORY_MAX);
    if (
      row.status === "active" &&
      row.tokenHash &&
      row.registeredAt &&
      row.holderName &&
      row.holderPhone
    ) {
      sessions.push({
        tokenHash: row.tokenHash,
        registeredAt: row.registeredAt,
        holderName: row.holderName,
        holderPhone: row.holderPhone,
      });
    }
  }
  const sorted = sortSessions(sessions).slice(-HOUSE_ACCESS_MAX_DEVICES);
  const record = await createUnifiedPass(houseId, { resetCount, history });
  if (sorted.length > 0) {
    await updateNightPass(record.id, (current) => {
      if (!current || !isUnifiedHouseAccess(current)) return null;
      return { ...current, sessions: sorted, updatedAt: new Date().toISOString() };
    });
  }
  for (const row of rows) {
    if (row.id !== record.id) await deleteNightPass(row.id).catch(() => undefined);
  }
  return (await readNightPass(record.id)) ?? record;
}

/** One family code + up to four device sessions. */
export async function ensureHouseAccess(houseId: string, preferredCode?: string): Promise<NightPassRecord> {
  let rows = await listHouseNightPasses(houseId);
  const unified = rows.find(isUnifiedHouseAccess);
  if (unified) {
    for (const row of rows) {
      if (row.id !== unified.id) await deleteNightPass(row.id).catch(() => undefined);
    }
    return (await readNightPass(unified.id)) ?? unified;
  }
  if (rows.length > 0) return migrateLegacyPasses(houseId, rows);
  return createUnifiedPass(houseId, undefined, preferredCode);
}

/** @deprecated Prefer {@link ensureHouseAccess}. */
export async function ensureHouseNightPasses(houseId: string): Promise<NightPassRecord[]> {
  return [await ensureHouseAccess(houseId)];
}

export type RedeemOutcome =
  | { ok: true; record: NightPassRecord; token: string; reregistered: boolean; evicted?: boolean }
  | { ok: false; error: "invalid" };

export async function redeemNightPass(input: {
  code: string;
  name: string;
  phone: string;
  priorToken?: string | null;
}): Promise<RedeemOutcome> {
  const id = passIdForCode(input.code);
  const token = randomBytes(24).toString("base64url");
  const tokenHash = hashNightPassToken(token);
  let outcome: "invalid" | "registered" | "reregistered" = "invalid";
  let evicted = false;

  const record = await updateNightPass(id, (current) => {
    if (!current || current.code !== input.code) {
      outcome = "invalid";
      return null;
    }
    const now = new Date().toISOString();

    if (isUnifiedHouseAccess(current)) {
      let sessions = [...(current.sessions ?? [])];
      const priorIdx =
        input.priorToken != null
          ? sessions.findIndex((s) => sessionTokenMatches(s, input.priorToken!))
          : -1;
      if (priorIdx >= 0) {
        outcome = "reregistered";
        sessions[priorIdx] = {
          tokenHash,
          registeredAt: now,
          holderName: input.name,
          holderPhone: input.phone,
        };
      } else {
        outcome = "registered";
        if (sessions.length >= HOUSE_ACCESS_MAX_DEVICES) {
          sessions = sortSessions(sessions);
          sessions.shift();
          evicted = true;
        }
        sessions.push({
          tokenHash,
          registeredAt: now,
          holderName: input.name,
          holderPhone: input.phone,
        });
      }
      return {
        ...current,
        sessions,
        updatedAt: now,
        history: withEvent(current.history, {
          type: outcome === "reregistered" ? "reregistered" : "registered",
          at: now,
          name: input.name,
          phone: input.phone,
        }),
      };
    }

    const again = current.status === "active";
    outcome = again ? "reregistered" : "registered";
    return {
      ...current,
      status: "active",
      holderName: input.name,
      holderPhone: input.phone,
      tokenHash,
      registeredAt: now,
      registrations: (current.registrations ?? 0) + 1,
      history: withEvent(current.history, {
        type: again ? "reregistered" : "registered",
        at: now,
        name: input.name,
        phone: input.phone,
      }),
      updatedAt: now,
    };
  });

  if (outcome === "invalid" || !record) {
    return { ok: false, error: "invalid" };
  }
  return {
    ok: true,
    record,
    token,
    reregistered: outcome === "reregistered",
    evicted,
  };
}

/** Owner device on add-house — no typed code. */
export async function registerHouseAccessDevice(input: {
  houseId: string;
  name: string;
  phone: string;
  preferredCode?: string;
  priorToken?: string | null;
}): Promise<RedeemOutcome> {
  const access = await ensureHouseAccess(input.houseId, input.preferredCode);
  return redeemNightPass({
    code: access.code,
    name: input.name,
    phone: input.phone,
    priorToken: input.priorToken,
  });
}

export type ResetOutcome =
  | { ok: true; record: NightPassRecord }
  | { ok: false; error: "missing" };

/** New family code — all devices must reconnect. */
export async function resetHouseAccess(houseId: string): Promise<ResetOutcome> {
  const current = await ensureHouseAccess(houseId);
  const oldId = current.id;
  const record = await createUnifiedPass(houseId, {
    resetCount: current.resetCount + 1,
    history: withEvent(current.history, {
      type: "reset",
      at: new Date().toISOString(),
    }),
  });
  if (oldId !== record.id) await deleteNightPass(oldId);
  return { ok: true, record };
}

/** @deprecated Use {@link resetHouseAccess}. */
export async function resetNightPassSlot(houseId: string): Promise<ResetOutcome> {
  return resetHouseAccess(houseId);
}

export async function validNightPassForToken(
  passId: string,
  token: string,
): Promise<NightPassRecord | null> {
  if (!/^[0-9a-f]{32}$/.test(passId) || !token || token.length > 100) return null;
  const record = await readNightPass(passId);
  if (!record) return null;

  if (isUnifiedHouseAccess(record)) {
    const sessions = record.sessions ?? [];
    if (sessions.some((s) => sessionTokenMatches(s, token))) return record;
    return null;
  }

  if (record.status !== "active" || !record.tokenHash) return null;
  const expected = Buffer.from(record.tokenHash);
  const got = Buffer.from(hashNightPassToken(token));
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  return record;
}

export type HouseAccessDeviceView = {
  holderName: string;
  holderPhone: string;
  registeredAt: string;
  isThisDevice: boolean;
};

export type HouseAccessView = {
  familyCode: string;
  connectedCount: number;
  maxDevices: number;
  devices: HouseAccessDeviceView[];
  resetCount: number;
};

export function houseAccessView(
  record: NightPassRecord,
  thisDeviceToken: string | null,
): HouseAccessView {
  if (isUnifiedHouseAccess(record)) {
    const devices = (record.sessions ?? []).map((s) => ({
      holderName: s.holderName,
      holderPhone: s.holderPhone,
      registeredAt: s.registeredAt,
      isThisDevice: thisDeviceToken != null && sessionTokenMatches(s, thisDeviceToken),
    }));
    return {
      familyCode: formatHouseAccessCode(record.code),
      connectedCount: devices.length,
      maxDevices: HOUSE_ACCESS_MAX_DEVICES,
      devices,
      resetCount: record.resetCount,
    };
  }
  const devices =
    record.status === "active" && record.holderName && record.holderPhone && record.registeredAt
      ? [
          {
            holderName: record.holderName,
            holderPhone: record.holderPhone,
            registeredAt: record.registeredAt,
            isThisDevice:
              thisDeviceToken != null &&
              record.tokenHash != null &&
              sessionTokenMatches(
                {
                  tokenHash: record.tokenHash,
                  registeredAt: record.registeredAt,
                  holderName: record.holderName,
                  holderPhone: record.holderPhone,
                },
                thisDeviceToken,
              ),
          },
        ]
      : [];
  return {
    familyCode: formatHouseAccessCode(record.code),
    connectedCount: devices.length,
    maxDevices: HOUSE_ACCESS_MAX_DEVICES,
    devices,
    resetCount: record.resetCount,
  };
}

/** @deprecated */
export type NightPassSlotView = {
  slot: number;
  code: string;
  status: "unused" | "active";
  holderName: string | null;
  holderPhone: string | null;
  registeredAt: string | null;
  registrations: number;
  resetCount: number;
};

/** Legacy slot list — maps unified pool to four UI rows. */
export function nightPassSlotView(record: NightPassRecord, _admin: boolean): NightPassSlotView {
  const view = houseAccessView(record, null);
  return {
    slot: 1,
    code: view.familyCode,
    status: view.connectedCount > 0 ? "active" : "unused",
    holderName: view.devices[0]?.holderName ?? null,
    holderPhone: view.devices[0]?.holderPhone ?? null,
    registeredAt: view.devices[0]?.registeredAt ?? null,
    registrations: view.connectedCount,
    resetCount: view.resetCount,
  };
}
