/** Client-safe house access code helpers (no Node crypto). */

/** No 0/O, 1/I/L — legacy 4-char codes only. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Entrance / edit / device registration — 6 numeric digits. */
export const HOUSE_ACCESS_CODE_LENGTH = 6;
export const LEGACY_ALPHABET_ACCESS_CODE_LENGTH = 4;
export const HOUSE_ACCESS_MAX_DEVICES = 4;

export function isSixDigitEntranceCode(code: string): boolean {
  return /^\d{6}$/.test(code.replace(/\s/g, ""));
}

/** @deprecated use isSixDigitEntranceCode */
export function isLegacyNumericEditCode(code: string): boolean {
  return isSixDigitEntranceCode(code);
}

function normalizeLegacyAlphabetAccessCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.toUpperCase().replace(/[\s\-_.]/g, "");
  if (cleaned.length !== LEGACY_ALPHABET_ACCESS_CODE_LENGTH) return null;
  for (const ch of cleaned) {
    if (!CODE_ALPHABET.includes(ch)) return null;
  }
  return cleaned;
}

/** Labels / inputs for a known stored code (dialog) or defaults for empty fields. */
export function editCodeSpecForDisplay(storedCode?: string) {
  if (storedCode && normalizeLegacyAlphabetAccessCode(storedCode)) {
    return {
      maxLength: LEGACY_ALPHABET_ACCESS_CODE_LENGTH,
      labelSuffix: "4 תווים (ישן)",
      placeholder: "K7QM",
    };
  }
  return {
    maxLength: HOUSE_ACCESS_CODE_LENGTH,
    labelSuffix: "6 ספרות",
    placeholder: "123456",
  };
}

/** Accept 6-digit entrance codes and legacy 4-letter codes. */
export function normalizeHouseAccessCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === HOUSE_ACCESS_CODE_LENGTH) return digits;
  return normalizeLegacyAlphabetAccessCode(raw);
}

export function houseEditCodesMatch(stored: string, normalizedInput: string): boolean {
  const normalizedStored = normalizeHouseAccessCode(stored);
  if (!normalizedStored) return false;
  return normalizedStored === normalizedInput;
}

export function formatEditCodeDisplay(code: string): string {
  if (isSixDigitEntranceCode(code)) return code.replace(/\s/g, "").split("").join(" ");
  return code;
}

/** Legacy 4-char alphabet normalizer — existing rows from the short-code rollout. */
export function normalizeNightPassCode(raw: unknown): string | null {
  return normalizeLegacyAlphabetAccessCode(raw);
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

/** Alphabet for legacy code generation (reset should use {@link newHouseAccessCode} digits). */
export function houseAccessCodeAlphabet() {
  return CODE_ALPHABET;
}
