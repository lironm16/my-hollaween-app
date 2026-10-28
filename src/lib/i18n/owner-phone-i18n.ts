import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";
import { isValidOwnerPhone } from "@/lib/owner-phone";

export function ownerPhoneValidationErrorLocalized(
  locale: AppLocale,
  raw: string,
  required: boolean,
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return required ? translate(locale, "houseForm.phoneRequired") : null;
  }
  if (!isValidOwnerPhone(trimmed)) {
    return translate(locale, "houseForm.phoneInvalid");
  }
  return null;
}
