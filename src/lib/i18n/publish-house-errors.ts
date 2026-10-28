import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

export function publishHouseClientError(
  locale: AppLocale,
  data: { error?: string; code?: string },
): string {
  if (data.code === "ADD_CLOSED") return translate(locale, "add.closedMessage");
  if (data.code === "VALIDATION") return translate(locale, "add.validationFailed");
  if (data.error?.trim()) return data.error.trim();
  return translate(locale, "add.publishServerFailed");
}
