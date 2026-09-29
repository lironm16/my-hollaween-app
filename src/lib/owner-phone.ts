import { z } from "zod";

/** Internal contact — never in the public catalog. */
export function normalizeOwnerPhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("972") && digits.length >= 11) return `+${digits}`;
  if (digits.startsWith("0")) return digits;
  return digits;
}

/** Israeli mobile (05…) or landline (0[2-4,8,9]…), with optional +972 prefix. */
export function isValidOwnerPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return false;

  if (digits.startsWith("972")) {
    const local = digits.slice(3);
    if (local.length === 9 && /^5[0-9]{8}$/.test(local)) return true;
    if (local.length >= 8 && local.length <= 9 && /^[23489]/.test(local)) return true;
    return false;
  }

  if (!digits.startsWith("0")) return false;
  if (/^05[0-9]{8}$/.test(digits)) return true;
  if (/^0[23489][0-9]{7,8}$/.test(digits)) return true;
  return false;
}

export function ownerPhoneValidationError(raw: string, required: boolean): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return required ? "נא למלא מספר טלפון." : null;
  }
  if (!isValidOwnerPhone(trimmed)) {
    return "מספר לא תקין — נייד ישראלי (050-1234567) או קווי עם קידומת אזור.";
  }
  return null;
}

export const ownerPhoneSchema = z
  .string()
  .trim()
  .min(1, "נא למלא טלפון ליצירת קשר.")
  .refine(isValidOwnerPhone, "מספר טלפון לא תקין");

export const ownerPhonePatchSchema = z.preprocess(
  (value) => (value === null || value === undefined ? undefined : value),
  z
    .string()
    .trim()
    .refine((v) => !v || isValidOwnerPhone(v), "מספר טלפון לא תקין")
    .optional(),
);

export const QUICK_UPDATE_PATCH_KEYS = new Set([
  "treats",
  "treatStock",
  "visit",
  "ownerFrozenUntil",
  "soldOut",
]);

const PATCH_META_KEYS = new Set(["editCode", "includeEndpoint"]);

export function isQuickUpdatePatch(patch: Record<string, unknown>): boolean {
  for (const key of Object.keys(patch)) {
    if (PATCH_META_KEYS.has(key)) continue;
    if (patch[key] === undefined) continue;
    if (!QUICK_UPDATE_PATCH_KEYS.has(key)) return false;
  }
  return true;
}

export function ownerPhoneAfterPatch(
  existing: { ownerPhone?: string | null },
  patch: { ownerPhone?: string | null | undefined },
): string | null {
  if (patch.ownerPhone !== undefined) {
    const normalized = normalizeOwnerPhone(String(patch.ownerPhone ?? ""));
    return normalized || null;
  }
  const kept = existing.ownerPhone?.trim();
  return kept ? normalizeOwnerPhone(kept) : null;
}

export class OwnerPhoneRequiredError extends Error {
  constructor(message = "נא למלא טלפון ליצירת קשר עם מנהל האירוע.") {
    super(message);
    this.name = "OwnerPhoneRequiredError";
  }
}

export class OwnerPhoneInvalidError extends Error {
  constructor(message = "מספר טלפון לא תקין.") {
    super(message);
    this.name = "OwnerPhoneInvalidError";
  }
}

export function assertOwnerPhoneForFullPatch(
  existing: { ownerPhone?: string | null },
  patch: Record<string, unknown>,
): void {
  if (isQuickUpdatePatch(patch)) return;
  const hasPhoneField = patch.ownerPhone !== undefined;
  const phone = ownerPhoneAfterPatch(existing, patch as { ownerPhone?: string });
  if (!phone) {
    throw new OwnerPhoneRequiredError();
  }
  if (!isValidOwnerPhone(phone)) {
    throw new OwnerPhoneInvalidError();
  }
  if (hasPhoneField && patch.ownerPhone !== undefined) {
    const raw = String(patch.ownerPhone ?? "").trim();
    if (raw && !isValidOwnerPhone(raw)) {
      throw new OwnerPhoneInvalidError();
    }
  }
}

export function ownerPhoneHttpError(error: unknown): { error: string; status: 400 } | null {
  if (error instanceof OwnerPhoneRequiredError || error instanceof OwnerPhoneInvalidError) {
    return { error: error.message, status: 400 };
  }
  return null;
}
