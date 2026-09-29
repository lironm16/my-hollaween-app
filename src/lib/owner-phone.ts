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

export function isValidOwnerPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return false;
  if (digits.startsWith("972")) return digits.length >= 11 && digits.length <= 13;
  if (digits.startsWith("0")) return digits.length >= 9 && digits.length <= 10;
  return digits.length >= 9 && digits.length <= 15;
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

export function assertOwnerPhoneForFullPatch(
  existing: { ownerPhone?: string | null },
  patch: Record<string, unknown>,
): void {
  if (isQuickUpdatePatch(patch)) return;
  const phone = ownerPhoneAfterPatch(existing, patch as { ownerPhone?: string });
  if (!phone || !isValidOwnerPhone(phone)) {
    throw new OwnerPhoneRequiredError();
  }
}

export function ownerPhoneHttpError(error: unknown): { error: string; status: 400 } | null {
  if (error instanceof OwnerPhoneRequiredError) {
    return { error: error.message, status: 400 };
  }
  return null;
}
