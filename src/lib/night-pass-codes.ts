import { createHash, randomInt } from "node:crypto";

/** No 0/O, 1/I/L — codes are read aloud and typed on phones. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** Legacy per-slot codes (migration only). */
export const NIGHT_PASS_CODE_LENGTH = 8;
/** Unified family code — edit + map access. */
export const HOUSE_ACCESS_CODE_LENGTH = 4;
export const HOUSE_ACCESS_MAX_DEVICES = 4;

export function newNightPassCode() {
  let out = "";
  for (let i = 0; i < NIGHT_PASS_CODE_LENGTH; i += 1) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

export function newHouseAccessCode() {
  let out = "";
  for (let i = 0; i < HOUSE_ACCESS_CODE_LENGTH; i += 1) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

/** Uppercase and strip separators so `k7qm-3xpa` and `K7QM 3XPA` match. */
export function normalizeNightPassCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.toUpperCase().replace(/[\s\-_.]/g, "");
  const len = cleaned.length;
  if (len !== NIGHT_PASS_CODE_LENGTH && len !== HOUSE_ACCESS_CODE_LENGTH) return null;
  for (const ch of cleaned) {
    if (!CODE_ALPHABET.includes(ch)) return null;
  }
  return cleaned;
}

export function formatNightPassCode(code: string) {
  if (code.length === 8) return `${code.slice(0, 4)}-${code.slice(4)}`;
  return code;
}

export function formatHouseAccessCode(code: string) {
  return code.length === HOUSE_ACCESS_CODE_LENGTH ? code : formatNightPassCode(code);
}

/** Legacy — pass docs keyed by code before house-scoped ids. */
export function passIdForCode(code: string) {
  return createHash("sha256").update(`hw-night-pass:${code}`).digest("hex").slice(0, 32);
}

/** Stable pass document id — survives family code reset; code lives only on the house. */
export function passIdForHouse(houseId: string) {
  const id = houseId.trim();
  return createHash("sha256").update(`hw-house-access:${id}`).digest("hex").slice(0, 32);
}

export function hashNightPassToken(token: string) {
  return createHash("sha256").update(`hw-night-pass-token:${token}`).digest("hex");
}

/** Israeli mobile → `05XXXXXXXX`. Accepts +972 / 972 prefixes, spaces and dashes. */
export function normalizeIsraeliMobile(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) digits = `0${digits.slice(3)}`;
  if (!/^05\d{8}$/.test(digits)) return null;
  return digits;
}

export function normalizeHolderName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 40) return null;
  return name;
}

export function maskPhone(phone: string) {
  return phone.length >= 10 ? `${phone.slice(0, 3)}-•••-${phone.slice(-4)}` : phone;
}
