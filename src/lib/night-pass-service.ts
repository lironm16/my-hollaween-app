import { randomBytes, randomUUID, timingSafeEqual } from "crypto";
import {
  countOwnerSessions,
  normalizeHouseAccessRole,
  sessionIsOwner,
  type HouseAccessRole,
} from "@/lib/house-access-role";
import {
  formatHouseAccessCode,
  HOUSE_ACCESS_MAX_DEVICES,
  normalizeHolderName,
  normalizeIsraeliMobile,
} from "@/lib/house-access-code";
import type { NightPassClientBrowser, NightPassClientSurface } from "@/lib/night-pass-client-surface";
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
import { ownerMayEdit, primaryOwnerMayManage } from "@/lib/owner-session";
import { deviceSessionOnHouse } from "@/lib/night-pass-session";
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
  clientSurface?: NightPassClientSurface;
  clientBrowser?: NightPassClientBrowser;
  role?: HouseAccessRole;
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
    const sessions = [...current.sessions];
    const priorIdx =
      input.priorSessionId != null
        ? sessions.findIndex((s) => s.sessionId === input.priorSessionId)
        : -1;
    const sameIdentity = (session: HouseAccessSession) =>
      normalizeHolderName(session.holderName) === input.name &&
      normalizeIsraeliMobile(session.holderPhone) === input.phone;
    const surface = input.clientSurface;
    const browser = input.clientBrowser;
    const role = input.role ?? "editor";
    if (priorIdx >= 0) {
      outcome = "reregistered";
      sessions[priorIdx] = {
        ...sessions[priorIdx]!,
        tokenHash,
        registeredAt: now,
        holderName: input.name,
        holderPhone: input.phone,
        role: sessions[priorIdx]!.role ?? role,
        ...(surface ? { clientSurface: surface } : {}),
        ...(browser ? { clientBrowser: browser } : {}),
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
        role,
        ...(surface ? { clientSurface: surface } : {}),
        ...(browser ? { clientBrowser: browser } : {}),
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
  clientSurface?: NightPassClientSurface;
  clientBrowser?: NightPassClientBrowser;
  role?: HouseAccessRole;
}): Promise<RedeemOutcome> {
  const house = await getHouse(input.houseId);
  if (!house?.editCode?.trim()) return { ok: false, error: "invalid" };
  return redeemNightPass({
    code: house.editCode,
    name: input.name,
    phone: input.phone,
    priorSessionId: input.priorSessionId,
    clientSurface: input.clientSurface,
    clientBrowser: input.clientBrowser,
    role: input.role ?? "editor",
  });
}

export async function updateHouseAccessSessionRole(input: {
  houseId: string;
  targetSessionId: string;
  role: HouseAccessRole;
  callerSessionId: string;
}): Promise<{ ok: true } | { ok: false; error: "missing" | "forbidden" | "last_owner" }> {
  const id = passId(input.houseId);
  let result: { ok: true } | { ok: false; error: "missing" | "forbidden" | "last_owner" } = {
    ok: false,
    error: "missing",
  };
  await updateNightPass(id, (current) => {
    if (!current) return null;
    const sessions = [...current.sessions];
    const callerIdx = sessions.findIndex((s) => s.sessionId === input.callerSessionId);
    const targetIdx = sessions.findIndex((s) => s.sessionId === input.targetSessionId);
    if (callerIdx < 0 || targetIdx < 0) {
      result = { ok: false, error: "missing" };
      return null;
    }
    const caller = sessions[callerIdx]!;
    const target = sessions[targetIdx]!;
    const callerRole = normalizeHouseAccessRole(caller.role);
    const nextRole = input.role;
    const owners = countOwnerSessions(sessions);

    if (nextRole === "owner") {
      if (!sessionIsOwner(caller) && owners > 0) {
        result = { ok: false, error: "forbidden" };
        return null;
      }
    } else if (callerRole !== "owner" && callerRole !== "editor") {
      result = { ok: false, error: "forbidden" };
      return null;
    }

    const targetWasOwner = sessionIsOwner(target);
    if (targetWasOwner && nextRole === "editor" && owners <= 1) {
      result = { ok: false, error: "last_owner" };
      return null;
    }

    sessions[targetIdx] = { ...target, role: nextRole };
    result = { ok: true };
    return {
      ...current,
      sessions,
      updatedAt: new Date().toISOString(),
    };
  });
  return result;
}

/** Admin — set role without caller permission checks (still enforces ≥1 owner). */
export async function adminSetHouseAccessSessionRole(
  houseId: string,
  targetSessionId: string,
  role: HouseAccessRole,
): Promise<{ ok: true } | { ok: false; error: "missing" | "last_owner" }> {
  const id = passId(houseId);
  let result: { ok: true } | { ok: false; error: "missing" | "last_owner" } = {
    ok: false,
    error: "missing",
  };
  await updateNightPass(id, (current) => {
    if (!current) return null;
    const sessions = [...current.sessions];
    const targetIdx = sessions.findIndex((s) => s.sessionId === targetSessionId);
    if (targetIdx < 0) {
      result = { ok: false, error: "missing" };
      return null;
    }
    const target = sessions[targetIdx]!;
    if (sessionIsOwner(target) && role === "editor" && countOwnerSessions(sessions) <= 1) {
      result = { ok: false, error: "last_owner" };
      return null;
    }
    sessions[targetIdx] = { ...target, role };
    result = { ok: true };
    return { ...current, sessions, updatedAt: new Date().toISOString() };
  });
  return result;
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
        type: "removed",
        at: now,
        name: target.holderName,
        phone: target.holderPhone,
        sessionId,
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
  if (!houseAccessSessionForDevice(record, sessionId, token)) return null;
  const house = await getHouse(record.houseId);
  if (!house) return null;
  return record;
}

/** Drop device registry when a house row is removed from the event. */
export async function purgeHouseNightPass(houseId: string) {
  const canonical = passId(houseId);
  for (const row of await listHouseNightPasses(houseId)) {
    await deleteNightPass(row.id).catch(() => undefined);
  }
  await deleteNightPass(canonical).catch(() => undefined);
}

export type HouseAccessDeviceView = {
  sessionId: string;
  holderName: string;
  holderPhone: string;
  registeredAt: string;
  role: HouseAccessRole;
  isThisDevice: boolean;
  clientSurface?: HouseAccessSession["clientSurface"];
  clientBrowser?: HouseAccessSession["clientBrowser"];
};

export type HouseAccessView = {
  familyCode: string;
  connectedCount: number;
  maxDevices: number;
  devices: HouseAccessDeviceView[];
  resetCount: number;
};

export function accessRecordLacksOwner(record: Pick<NightPassRecord, "sessions">) {
  return countOwnerSessions(record.sessions) === 0;
}

/** Owner session, or recovery when the house has no owner device (edit cookie or any registered device). */
export async function mayManageHouseDevices(
  houseId: string,
  options?: { admin?: boolean },
): Promise<boolean> {
  if (options?.admin) return true;
  if (await ownerMayEdit(houseId)) return true;
  if (await primaryOwnerMayManage(houseId)) return true;
  const record = await ensureHouseAccess(houseId);
  if (!accessRecordLacksOwner(record)) return false;
  return Boolean(await deviceSessionOnHouse(houseId));
}

/** Owners may remove any device; editors may remove editor devices only. */
export async function callerMayRemoveHouseAccessSession(
  houseId: string,
  targetSessionId: string,
  options?: { admin?: boolean },
): Promise<{ ok: true } | { ok: false; error: "forbidden" | "missing" }> {
  if (options?.admin) return { ok: true };
  const record = await ensureHouseAccess(houseId);
  const target = record.sessions.find((s) => s.sessionId === targetSessionId);
  if (!target) return { ok: false, error: "missing" };

  if (await primaryOwnerMayManage(houseId)) return { ok: true };

  if (accessRecordLacksOwner(record)) {
    if (await ownerMayEdit(houseId)) return { ok: true };
    if (await deviceSessionOnHouse(houseId)) return { ok: true };
    return { ok: false, error: "forbidden" };
  }

  const caller = await deviceSessionOnHouse(houseId);
  if (!caller) return { ok: false, error: "forbidden" };
  if (sessionIsOwner(caller)) return { ok: true };
  if (sessionIsOwner(target)) return { ok: false, error: "forbidden" };
  return { ok: true };
}

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
    role: normalizeHouseAccessRole(s.role),
    clientSurface: s.clientSurface,
    clientBrowser: s.clientBrowser,
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
