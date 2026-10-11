import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  formatNightPassCode,
  hashNightPassToken,
  newNightPassCode,
  passIdForCode,
} from "@/lib/night-pass-codes";
import {
  NIGHT_PASS_SLOTS,
  deleteNightPass,
  listHouseNightPasses,
  readNightPass,
  updateNightPass,
  type NightPassEvent,
  type NightPassRecord,
  type NightPassSlot,
} from "@/lib/night-pass-store";

/** Owner resets per slot; admin is unlimited. Resets are the only way to hand a slot to someone else. */
export const OWNER_RESET_LIMIT = 3;
const HISTORY_MAX = 20;

function withEvent(history: NightPassEvent[], event: NightPassEvent) {
  return [...history, event].slice(-HISTORY_MAX);
}

async function createPass(
  houseId: string,
  slot: NightPassSlot,
  carry?: Pick<NightPassRecord, "resetCount" | "history">,
): Promise<NightPassRecord> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = newNightPassCode();
    const id = passIdForCode(code);
    const now = new Date().toISOString();
    const record: NightPassRecord = {
      id,
      houseId,
      slot,
      code,
      status: "unused",
      holderName: null,
      holderPhone: null,
      tokenHash: null,
      registeredAt: null,
      registrations: 0,
      resetCount: carry?.resetCount ?? 0,
      history: carry?.history ?? [],
      createdAt: now,
      updatedAt: now,
    };
    let created = false as boolean;
    await updateNightPass(id, (current) => {
      if (current) return null;
      created = true;
      return record;
    });
    if (created) return record;
  }
  throw new Error("NIGHT_PASS_CODE_COLLISION");
}

/** The house's four passes, creating any missing slot (first owner visit / older houses). */
export async function ensureHouseNightPasses(houseId: string): Promise<NightPassRecord[]> {
  let rows = await listHouseNightPasses(houseId);
  const missing = NIGHT_PASS_SLOTS.filter((slot) => !rows.some((row) => row.slot === slot));
  if (missing.length === 0) return dedupeSlots(rows);
  for (const slot of missing) await createPass(houseId, slot);
  rows = await listHouseNightPasses(houseId);
  return dedupeSlots(rows);
}

/** Two concurrent first visits can both create a slot — keep the oldest, drop the rest. */
async function dedupeSlots(rows: NightPassRecord[]) {
  const keep = new Map<NightPassSlot, NightPassRecord>();
  const extra: NightPassRecord[] = [];
  for (const row of [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const current = keep.get(row.slot);
    if (!current) keep.set(row.slot, row);
    else if (row.status === "active" && current.status !== "active") {
      extra.push(current);
      keep.set(row.slot, row);
    } else extra.push(row);
  }
  for (const row of extra) {
    if (row.status !== "active") await deleteNightPass(row.id).catch(() => undefined);
  }
  return [...keep.values()].sort((a, b) => a.slot - b.slot);
}

export type RedeemOutcome =
  | { ok: true; record: NightPassRecord; token: string; reregistered: boolean }
  | { ok: false; error: "invalid" };

/**
 * Register a device on a pass. Each redeem replaces the device token — only the last device stays valid.
 */
export async function redeemNightPass(input: {
  code: string;
  name: string;
  phone: string;
}): Promise<RedeemOutcome> {
  const id = passIdForCode(input.code);
  const token = randomBytes(24).toString("base64url");
  const tokenHash = hashNightPassToken(token);
  let outcome = "invalid" as "invalid" | "registered" | "reregistered";
  const record = await updateNightPass(id, (current) => {
    if (!current || current.code !== input.code) {
      outcome = "invalid";
      return null;
    }
    const again = current.status === "active";
    outcome = again ? "reregistered" : "registered";
    const now = new Date().toISOString();
    return {
      ...current,
      status: "active",
      holderName: input.name,
      holderPhone: input.phone,
      tokenHash,
      registeredAt: now,
      registrations: current.registrations + 1,
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
  return { ok: true, record, token, reregistered: outcome === "reregistered" };
}

export type ResetOutcome =
  | { ok: true; record: NightPassRecord }
  | { ok: false; error: "missing" | "limit" };

/** New code for a slot; the device registered on the old code loses access on its next sync. */
export async function resetNightPassSlot(
  houseId: string,
  slot: NightPassSlot,
  options: { admin: boolean },
): Promise<ResetOutcome> {
  const rows = await ensureHouseNightPasses(houseId);
  const current = rows.find((row) => row.slot === slot);
  if (!current) return { ok: false, error: "missing" };
  if (!options.admin && current.resetCount >= OWNER_RESET_LIMIT) return { ok: false, error: "limit" };
  const record = await createPass(houseId, slot, {
    resetCount: current.resetCount + 1,
    history: withEvent(current.history, {
      type: "reset",
      at: new Date().toISOString(),
      ...(current.holderName ? { name: current.holderName } : {}),
      ...(current.holderPhone ? { phone: current.holderPhone } : {}),
    }),
  });
  await deleteNightPass(current.id);
  return { ok: true, record };
}

/** Pass for a device cookie — only the most recent registration's token matches. */
export async function validNightPassForToken(
  passId: string,
  token: string,
): Promise<NightPassRecord | null> {
  if (!/^[0-9a-f]{32}$/.test(passId) || !token || token.length > 100) return null;
  const record = await readNightPass(passId);
  if (!record || record.status !== "active" || !record.tokenHash) return null;
  const expected = Buffer.from(record.tokenHash);
  const got = Buffer.from(hashNightPassToken(token));
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  return record;
}

export type NightPassSlotView = {
  slot: NightPassSlot;
  code: string;
  status: "unused" | "active";
  holderName: string | null;
  holderPhone: string | null;
  registeredAt: string | null;
  registrations: number;
  resetCount: number;
  /** null = unlimited (admin). */
  resetsLeft: number | null;
};

export function nightPassSlotView(record: NightPassRecord, admin: boolean): NightPassSlotView {
  return {
    slot: record.slot,
    code: formatNightPassCode(record.code),
    status: record.status,
    holderName: record.holderName,
    holderPhone: record.holderPhone,
    registeredAt: record.registeredAt,
    registrations: record.registrations,
    resetCount: record.resetCount,
    resetsLeft: admin ? null : Math.max(0, OWNER_RESET_LIMIT - record.resetCount),
  };
}
