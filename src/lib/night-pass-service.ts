import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import {
  formatHouseAccessCode,
  hashNightPassToken,
  HOUSE_ACCESS_MAX_DEVICES,
  newHouseAccessCode,
  passIdForHouse,
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
import { getHouse, getHouseByAccessCode } from "@/lib/store";

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

function ensureSessionIds(sessions: HouseAccessSession[]): HouseAccessSession[] {
  return sessions.map((session) =>
    session.sessionId ? session : { ...session, sessionId: randomUUID() },
  );
}

function canonicalPassId(houseId: string) {
  return passIdForHouse(houseId);
}

async function createUnifiedPass(
  houseId: string,
  carry?: Pick<NightPassRecord, "resetCount" | "history">,
): Promise<NightPassRecord> {
  const id = canonicalPassId(houseId);
  const now = new Date().toISOString();
  const record: NightPassRecord = {
    id,
    houseId,
    model: "unified",
    sessions: [],
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
  if (!created) {
    const existing = await readNightPass(id);
    if (existing) return existing;
    throw new Error("HOUSE_ACCESS_CREATE_FAILED");
  }
  return record;
}

async function migrateToHouseScopedPass(
  houseId: string,
  source: NightPassRecord,
): Promise<NightPassRecord> {
  const id = canonicalPassId(houseId);
  if (source.id === id && isUnifiedHouseAccess(source)) {
    const sessions = ensureSessionIds(source.sessions ?? []);
    if (sessions !== source.sessions) {
      await updateNightPass(id, (current) => {
        if (!current) return null;
        return { ...current, sessions, updatedAt: new Date().toISOString() };
      });
    }
    return (await readNightPass(id)) ?? { ...source, sessions };
  }
  const sessions = ensureSessionIds(source.sessions ?? []);
  const now = new Date().toISOString();
  const next: NightPassRecord = {
    id,
    houseId,
    model: "unified",
    sessions,
    resetCount: source.resetCount ?? 0,
    history: source.history ?? [],
    createdAt: source.createdAt ?? now,
    updatedAt: now,
  };
  await updateNightPass(id, (current) => {
    if (current && isUnifiedHouseAccess(current)) {
      return {
        ...current,
        sessions: ensureSessionIds([...(current.sessions ?? []), ...sessions]).slice(
          -HOUSE_ACCESS_MAX_DEVICES,
        ),
        updatedAt: now,
      };
    }
    return next;
  });
  if (source.id !== id) await deleteNightPass(source.id).catch(() => undefined);
  return (await readNightPass(id)) ?? next;
}

async function migrateLegacyPasses(houseId: string, rows: NightPassRecord[]): Promise<NightPassRecord> {
  const sessions: HouseAccessSession[] = [];
  let history: NightPassEvent[] = [];
  let resetCount = 0;
  for (const row of rows) {
    resetCount = Math.max(resetCount, row.resetCount ?? 0);
    history = [...history, ...(row.history ?? [])].slice(-HISTORY_MAX);
    if (isUnifiedHouseAccess(row)) {
      for (const session of row.sessions ?? []) {
        sessions.push(session);
      }
      continue;
    }
    if (
      row.status === "active" &&
      row.tokenHash &&
      row.registeredAt &&
      row.holderName &&
      row.holderPhone
    ) {
      sessions.push({
        sessionId: randomUUID(),
        tokenHash: row.tokenHash,
        registeredAt: row.registeredAt,
        holderName: row.holderName,
        holderPhone: row.holderPhone,
      });
    }
  }
  const sorted = ensureSessionIds(sortSessions(sessions)).slice(-HOUSE_ACCESS_MAX_DEVICES);
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

/** Device sessions for a house — family code is only `house.editCode`. */
export async function ensureHouseAccess(houseId: string): Promise<NightPassRecord> {
  let rows = await listHouseNightPasses(houseId);
  const unified = rows.find(isUnifiedHouseAccess);
  if (unified) {
    for (const row of rows) {
      if (row.id !== unified.id) await deleteNightPass(row.id).catch(() => undefined);
    }
    return migrateToHouseScopedPass(houseId, (await readNightPass(unified.id)) ?? unified);
  }
  if (rows.length > 0) return migrateLegacyPasses(houseId, rows);
  return createUnifiedPass(houseId);
}

/** @deprecated Prefer {@link ensureHouseAccess}. */
export async function ensureHouseNightPasses(houseId: string): Promise<NightPassRecord[]> {
  return [await ensureHouseAccess(houseId)];
}

export type RedeemOutcome =
  | {
      ok: true;
      record: NightPassRecord;
      token: string;
      sessionId: string;
      reregistered: boolean;
      evicted?: boolean;
    }
  | { ok: false; error: "invalid" };

export async function redeemNightPass(input: {
  code: string;
  name: string;
  phone: string;
  priorToken?: string | null;
  priorSessionId?: string | null;
}): Promise<RedeemOutcome> {
  const house = await getHouseByAccessCode(input.code);
  if (!house) return { ok: false, error: "invalid" };

  await ensureHouseAccess(house.id);
  const id = canonicalPassId(house.id);
  const token = randomBytes(24).toString("base64url");
  const tokenHash = hashNightPassToken(token);
  const sessionId = randomUUID();
  let outcome: "invalid" | "registered" | "reregistered" = "invalid";
  let evicted = false;

  const record = await updateNightPass(id, (current) => {
    if (!current || !isUnifiedHouseAccess(current)) {
      outcome = "invalid";
      return null;
    }
    const now = new Date().toISOString();
    let sessions = ensureSessionIds([...(current.sessions ?? [])]);
    const priorIdx =
      input.priorSessionId != null
        ? sessions.findIndex((s) => s.sessionId === input.priorSessionId)
        : input.priorToken != null
          ? sessions.findIndex((s) => sessionTokenMatches(s, input.priorToken!))
          : -1;
    if (priorIdx >= 0) {
      outcome = "reregistered";
      sessions[priorIdx] = {
        sessionId: sessions[priorIdx]!.sessionId,
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
        sessionId,
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
  });

  if (outcome === "invalid" || !record) {
    return { ok: false, error: "invalid" };
  }
  const activeSessionId =
    outcome === "reregistered"
      ? ensureSessionIds(record.sessions ?? []).find((s) => sessionTokenMatches(s, token))?.sessionId ??
        sessionId
      : sessionId;
  return {
    ok: true,
    record,
    token,
    sessionId: activeSessionId,
    reregistered: outcome === "reregistered",
    evicted,
  };
}

/** Owner device on add-house — no typed code. */
export async function registerHouseAccessDevice(input: {
  houseId: string;
  name: string;
  phone: string;
  priorToken?: string | null;
  priorSessionId?: string | null;
}): Promise<RedeemOutcome> {
  const house = await getHouse(input.houseId);
  if (!house?.editCode?.trim()) return { ok: false, error: "invalid" };
  return redeemNightPass({
    code: house.editCode,
    name: input.name,
    phone: input.phone,
    priorToken: input.priorToken,
    priorSessionId: input.priorSessionId,
  });
}

export type ResetOutcome =
  | { ok: true; record: NightPassRecord; newCode: string }
  | { ok: false; error: "missing" };

/** New family code on the house — all device sessions cleared. */
export async function resetHouseAccess(houseId: string): Promise<ResetOutcome> {
  const record = await ensureHouseAccess(houseId);
  const newCode = newHouseAccessCode();
  const now = new Date().toISOString();
  const next = await updateNightPass(record.id, (current) => {
    if (!current || !isUnifiedHouseAccess(current)) return null;
    return {
      ...current,
      sessions: [],
      resetCount: current.resetCount + 1,
      history: withEvent(current.history, { type: "reset", at: now }),
      updatedAt: now,
    };
  });
  if (!next) return { ok: false, error: "missing" };
  return { ok: true, record: next, newCode };
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
    const sessions = ensureSessionIds(record.sessions ?? []);
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
  sessionId: string;
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
  familyCode: string,
  thisDeviceToken: string | null,
  thisDeviceSessionId?: string | null,
): HouseAccessView {
  const formatted = formatHouseAccessCode(familyCode);
  if (isUnifiedHouseAccess(record)) {
    const devices = ensureSessionIds(record.sessions ?? []).map((s) => ({
      sessionId: s.sessionId,
      holderName: s.holderName,
      holderPhone: s.holderPhone,
      registeredAt: s.registeredAt,
      isThisDevice:
        (thisDeviceSessionId != null && s.sessionId === thisDeviceSessionId) ||
        (thisDeviceToken != null && sessionTokenMatches(s, thisDeviceToken)),
    }));
    return {
      familyCode: formatted,
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
            sessionId: "legacy",
            holderName: record.holderName,
            holderPhone: record.holderPhone,
            registeredAt: record.registeredAt,
            isThisDevice:
              thisDeviceToken != null &&
              record.tokenHash != null &&
              sessionTokenMatches(
                {
                  sessionId: "legacy",
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
    familyCode: formatted,
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
export function nightPassSlotView(
  record: NightPassRecord,
  familyCode: string,
  _admin: boolean,
): NightPassSlotView {
  const view = houseAccessView(record, familyCode, null);
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
