/** Client-safe house access code helpers (no Node crypto). */

/** No 0/O, 1/I/L — codes are read aloud and typed on phones. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Family code — edit unlock + device registration. */
export const HOUSE_ACCESS_CODE_LENGTH = 4;
export const HOUSE_ACCESS_MAX_DEVICES = 4;

/** Uppercase and strip separators. */
export function normalizeNightPassCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.toUpperCase().replace(/[\s\-_.]/g, "");
  if (cleaned.length !== HOUSE_ACCESS_CODE_LENGTH) return null;
  for (const ch of cleaned) {
    if (!CODE_ALPHABET.includes(ch)) return null;
  }
  return cleaned;
}

export function formatHouseAccessCode(code: string) {
  return code;
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

/** Alphabet for server-side code generation. */
export function houseAccessCodeAlphabet() {
  return CODE_ALPHABET;
}
