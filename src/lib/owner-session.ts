import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { adminPassword } from "@/lib/admin";
import { canonicalHouseId, sameHouseId } from "@/lib/ids";
import { normalizeIsraeliMobile } from "@/lib/house-access-code";
import { houseAccessSessionForDevice } from "@/lib/night-pass-service";
import { currentNightPass, readNightPassCookie } from "@/lib/night-pass-session";
import { readNightPassSettings } from "@/lib/night-pass-store";
import { getHouse } from "@/lib/store/houses";

const COOKIE = "hw_owner";
const MAX_HOUSES = 20;
const MAX_AGE = 60 * 60 * 24 * 90;

type OwnerCookieEntry = { id: string; epoch: number };

function sign(entries: OwnerCookieEntry[]) {
  const payload = entries
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => `${e.id}@${e.epoch}`)
    .join("|");
  return createHmac("sha256", adminPassword()).update(payload).digest("hex");
}

function encodeEntry(id: string, epoch: number) {
  return `${canonicalHouseId(id)}@${epoch}`;
}

function parseEntry(raw: string): OwnerCookieEntry | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) {
    const id = canonicalHouseId(trimmed);
    return id ? { id, epoch: 0 } : null;
  }
  const id = canonicalHouseId(trimmed.slice(0, at));
  const epoch = Number.parseInt(trimmed.slice(at + 1), 10);
  if (!id || !Number.isFinite(epoch) || epoch < 0) return null;
  return { id, epoch };
}

function parseCookie(value: string | undefined): OwnerCookieEntry[] {
  if (!value) return [];
  const dot = value.indexOf(".");
  if (dot < 8) return [];
  const hmac = value.slice(0, dot);
  const encoded = value.slice(dot + 1);
  let entries: OwnerCookieEntry[] = [];
  try {
    entries = decodeURIComponent(encoded)
      .split(",")
      .map(parseEntry)
      .filter((entry): entry is OwnerCookieEntry => entry != null)
      .slice(0, MAX_HOUSES);
  } catch {
    return [];
  }
  const expected = sign(entries);
  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return [];
  return entries;
}

function ownerPhoneMatches(sessionPhone: string, housePhone: string | null | undefined) {
  const a = normalizeIsraeliMobile(sessionPhone);
  const b = normalizeIsraeliMobile(String(housePhone ?? ""));
  return Boolean(a && b && a === b);
}

async function cookieEntryValid(entry: OwnerCookieEntry): Promise<boolean> {
  const house = await getHouse(entry.id);
  if (!house) return false;
  return (house.ownerSessionEpoch ?? 0) === entry.epoch;
}

export async function grantOwnerHouse(id: string) {
  const canonical = canonicalHouseId(id);
  if (!canonical) return;
  const house = await getHouse(canonical);
  if (!house) return;
  const epoch = house.ownerSessionEpoch ?? 0;
  const jar = await cookies();
  const current = parseCookie(jar.get(COOKIE)?.value);
  const nextEntry: OwnerCookieEntry = { id: canonical, epoch };
  const ids = [
    nextEntry,
    ...current.filter((item) => !sameHouseId(item.id, canonical)),
  ].slice(0, MAX_HOUSES);
  jar.set(
    COOKIE,
    `${sign(ids)}.${encodeURIComponent(ids.map((e) => encodeEntry(e.id, e.epoch)).join(","))}`,
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    },
  );
}

/** House ids this device unlocked — only rows still on the event (deleted houses excluded). */
export async function ownerHouseIds(): Promise<string[]> {
  const jar = await cookies();
  const raw = parseCookie(jar.get(COOKIE)?.value);
  const ids: string[] = [];
  await Promise.all(
    raw.map(async (entry) => {
      if (!(await cookieEntryValid(entry))) return;
      if (await getHouse(entry.id)) ids.push(entry.id);
    }),
  );
  return ids.sort();
}

export async function ownerMayEdit(id: string) {
  const needle = canonicalHouseId(id);
  if (!needle) return false;
  if (!(await getHouse(needle))) return false;
  const jar = await cookies();
  const entries = parseCookie(jar.get(COOKIE)?.value);
  const entry = entries.find((item) => sameHouseId(item.id, needle));
  if (!entry) return false;
  return cookieEntryValid(entry);
}

/** Reset codes, invites, owner-only night-pass registration — not co-editors from invite/family code. */
export async function primaryOwnerMayManage(id: string): Promise<boolean> {
  const needle = canonicalHouseId(id);
  if (!needle) return false;
  const house = await getHouse(needle);
  if (!house) return false;
  const settings = await readNightPassSettings();
  if (!settings.enabled) {
    return ownerMayEdit(needle);
  }
  const pass = await currentNightPass();
  if (!pass || !sameHouseId(pass.houseId, needle)) return false;
  const cookie = await readNightPassCookie();
  const session =
    cookie != null
      ? houseAccessSessionForDevice(pass, cookie.sessionId, cookie.token)
      : null;
  if (!session) return false;
  return ownerPhoneMatches(session.holderPhone, house.ownerPhone);
}
