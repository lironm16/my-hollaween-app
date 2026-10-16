/** Client-safe house access code helpers (no Node crypto). */

/** No 0/O, 1/I/L — codes are read aloud and typed on phones. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Family code — edit unlock + device registration. */
export const HOUSE_ACCESS_CODE_LENGTH = 4;
/** Pre-2025 houses may still have a numeric edit code. */
export const LEGACY_EDIT_CODE_LENGTH = 6;
export const HOUSE_ACCESS_MAX_DEVICES = 4;

export function isLegacyNumericEditCode(code: string): boolean {
  return /^\d{6}$/.test(code.replace(/\s/g, ""));
}

/** Labels / inputs for a known stored edit code (dialog) or defaults for empty fields. */
export function editCodeSpecForDisplay(storedCode?: string) {
  if (storedCode && isLegacyNumericEditCode(storedCode)) {
    return {
      maxLength: LEGACY_EDIT_CODE_LENGTH,
      labelSuffix: "6 ספרות",
      placeholder: "123456",
    };
  }
  return {
    maxLength: HOUSE_ACCESS_CODE_LENGTH,
    labelSuffix: "4 תווים",
    placeholder: "K7QM",
  };
}

/** Accept 4-letter family codes and legacy 6-digit edit codes. */
export function normalizeHouseAccessCode(raw: unknown): string | null {
  const modern = normalizeNightPassCode(raw);
  if (modern) return modern;
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === LEGACY_EDIT_CODE_LENGTH) return digits;
  return null;
}

export function houseEditCodesMatch(stored: string, normalizedInput: string): boolean {
  const storedModern = normalizeNightPassCode(stored);
  if (storedModern && storedModern === normalizedInput) return true;
  if (isLegacyNumericEditCode(stored) && stored === normalizedInput) return true;
  return false;
}

export function formatEditCodeDisplay(code: string): string {
  if (isLegacyNumericEditCode(code)) return code.split("").join(" ");
  return code;
}

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
