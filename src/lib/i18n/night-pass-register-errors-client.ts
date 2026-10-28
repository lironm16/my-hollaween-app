import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

/** Map night-pass register API `code` to localized copy (ignore Hebrew `error` body). */
export function nightPassRegisterErrorFromCode(locale: AppLocale, code: string | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "full":
      return translate(locale, "nightPass.errRegisterFull");
    case "duplicate_identity":
      return translate(locale, "nightPass.errRegisterDuplicateIdentity");
    case "code_reset":
      return translate(locale, "nightPass.errRegisterCodeReset");
    case "invalid":
      return translate(locale, "nightPass.errRegisterInvalid");
    case "disabled":
      return translate(locale, "nightPass.registrationNotOpen");
    case "name":
      return translate(locale, "nightPass.errRegisterName");
    case "phone":
      return translate(locale, "nightPass.errRegisterPhone");
    case "rate":
      return translate(locale, "nightPass.errRegisterRate");
    case "forbidden":
      return translate(locale, "nightPass.errOwnerVerify");
    case "already":
      return translate(locale, "nightPass.errDeviceAlreadyRegistered");
    case "house":
      return translate(locale, "nightPass.errNoHouseOnDevice");
    default:
      return null;
  }
}

export function resolveNightPassRegisterError(
  locale: AppLocale,
  payload: { error?: string; code?: string } | null | undefined,
): string {
  const fromCode = nightPassRegisterErrorFromCode(locale, payload?.code);
  if (fromCode) return fromCode;
  return payload?.error?.trim() || translate(locale, "nightPass.errRegisterFailed");
}
