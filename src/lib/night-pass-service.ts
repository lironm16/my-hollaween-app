import { randomBytes, randomUUID, timingSafeEqual } from "crypto";
import {
  formatHouseAccessCode,
  HOUSE_ACCESS_MAX_DEVICES,
  normalizeHolderName,
  normalizeIsraeliMobile,
} from "@/lib/house-access-code";
import {
  hashNightPassToken,
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
import { getHouse, getHouseByAccessCode } from "@/lib/store/houses";

const HISTORY_MAX = 20;

function withEvent(history: NightPassEvent[], event: NightPassEvent) {
  return [...history, event].slice(-HISTORY_MAX);
}

function sessionTokenMatches(session: HouseAccessSession, token: string) {
  const expected = Buffer.from(session.tokenHash);
  const got = Buffer.from(hashNightPassToken(token));
  return expected.length === got.length && timingSafeEqual(expected, got);
}

function sortSessions(sessions: HouseAccessSession[]) {
  return [...sessions].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
}

function passId(houseId: string) {
  return passIdForHouse(houseId);
}

async function createHouseAccessRecord(
  houseId: string,
  carry?: Pick<NightPassRecord, "resetCount" | "history">,
): Promise<NightPassRecord> {
  const id = passId(houseId);
  const now = new Date().toISOString();
  const record: NightPassRecord = {
    id,
    houseId,
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

/** Device sessions for a house — family code is only `house.editCode`. */
export async function ensureHouseAccess(houseId: string): Promise<NightPassRecord> {
  const id = passId(houseId);
  for (const row of await listHouseNightPasses(houseId)) {
    if (row.id !== id) await deleteNightPass(row.id).catch(() => undefined);
  }
  const existing = await readNightPass(id);
  if (existing) return existing;
  return createHouseAccessRecord(houseId);
}

export type RedeemOutcome =
  | {
      ok: true;
      record: NightPassRecord;
      token: string;
      sessionId: string;
      reregistered: boolean;
    }
  | { ok: false; error: "invalid" | "full" | "duplicate_identity" };

export async function redeemNightPass(input: {
  code: string;
  name: string;
  phone: string;
  priorSessionId?: string | null;
}): Promise<RedeemOutcome> {
  const house = await getHouseByAccessCode(input.code);
  if (!house) return { ok: false, error: "invalid" };

  await ensureHouseAccess(house.id);
  const id = passId(house.id);
  const token = randomBytes(24).toString("base64url");
  const tokenHash = hashNightPassToken(token);
  const sessionId = randomUUID();
  let outcome: "invalid" | "registered" | "reregistered" = "invalid";
  let failError: "full" | "duplicate_identity" | null = null;

  const record = await updateNightPass(id, (current) => {
    if (!current) {
      outcome = "invalid";
      return null;
    }
    const now = new Date().toISOString();
    let sessions = [...current.sessions];
    const priorIdx =
      input.priorSessionId != null
        ? sessions.findIndex((s) => s.sessionId === input.priorSessionId)
        : -1;
    const sameIdentity = (session: HouseAccessSession) =>
      normalizeHolderName(session.holderName) === input.name &&
      normalizeIsraeliMobile(session.holderPhone) === input.phone;
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
      if (sessions.length >= HOUSE_ACCESS_MAX_DEVICES) {
        failError = "full";
        return null;
      }
      if (sessions.some((session) => sameIdentity(session))) {
        failError = "duplicate_identity";
        return null;
      }
      outcome = "registered";
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

  if (failError) return { ok: false, error: failError };
  if (outcome === "invalid" || !record) {
    return { ok: false, error: "invalid" };
  }
  const activeSessionId =
    outcome === "reregistered"
      ? (record.sessions.find((s) => sessionTokenMatches(s, token))?.sessionId ?? sessionId)
      : sessionId;
  return {
    ok: true,
    record,
    token,
    sessionId: activeSessionId,
    reregistered: outcome === "reregistered",
  };
}

/** Owner device on add-house — no typed code. */
export async function registerHouseAccessDevice(input: {
  houseId: string;
  name: string;
  phone: string;
  priorSessionId?: string | null;
}): Promise<RedeemOutcome> {
  const house = await getHouse(input.houseId);
  if (!house?.editCode?.trim()) return { ok: false, error: "invalid" };
  return redeemNightPass({
    code: house.editCode,
    name: input.name,
    phone: input.phone,
    priorSessionId: input.priorSessionId,
  });
}

export type ResetOutcome =
  | { ok: true; record: NightPassRecord; newCode: string }
  | { ok: false; error: "missing" };

/** New family code on the house — all device sessions cleared. */
/** Owner removes one paired device — frees a slot without resetting the family code. */
export async function removeHouseAccessSession(
  houseId: string,
  sessionId: string,
): Promise<boolean> {
  const id = passId(houseId);
  let removed = false;
  await updateNightPass(id, (current) => {
    if (!current) return null;
    const target = current.sessions.find((s) => s.sessionId === sessionId);
    if (!target) return null;
    removed = true;
    const now = new Date().toISOString();
    return {
      ...current,
      sessions: current.sessions.filter((s) => s.sessionId !== sessionId),
      updatedAt: now,
      history: withEvent(current.history, {
        type: "evicted",
        at: now,
        name: target.holderName,
        phone: target.holderPhone,
      }),
    };
  });
  return removed;
}

export async function resetHouseAccess(houseId: string): Promise<ResetOutcome> {
  const record = await ensureHouseAccess(houseId);
  const newCode = newHouseAccessCode();
  const now = new Date().toISOString();
  const next = await updateNightPass(record.id, (current) => {
    if (!current) return null;
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

export function houseAccessSessionForDevice(
  record: NightPassRecord,
  sessionId: string | null | undefined,
  token: string | null | undefined,
): HouseAccessSession | null {
  if (sessionId) {
    const byId = record.sessions.find((s) => s.sessionId === sessionId);
    if (byId) return byId;
  }
  if (token) {
    return record.sessions.find((s) => sessionTokenMatches(s, token)) ?? null;
  }
  return null;
}

export async function validNightPassForToken(
  passId: string,
  token: string,
  sessionId?: string | null,
): Promise<NightPassRecord | null> {
  if (!/^[0-9a-f]{32}$/.test(passId) || !token || token.length > 100) return null;
  const record = await readNightPass(passId);
  if (!record) return null;
  if (houseAccessSessionForDevice(record, sessionId, token)) return record;
  return null;
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
  thisDeviceSessionId: string | null | undefined,
  thisDeviceToken: string | null | undefined,
): HouseAccessView {
  const devices = record.sessions.map((s) => ({
    sessionId: s.sessionId,
    holderName: s.holderName,
    holderPhone: s.holderPhone,
    registeredAt: s.registeredAt,
    isThisDevice:
      (thisDeviceSessionId != null && s.sessionId === thisDeviceSessionId) ||
      (thisDeviceToken != null && sessionTokenMatches(s, thisDeviceToken)),
  }));
  return {
    familyCode: formatHouseAccessCode(familyCode),
    connectedCount: devices.length,
    maxDevices: HOUSE_ACCESS_MAX_DEVICES,
    devices,
    resetCount: record.resetCount,
  };
}
