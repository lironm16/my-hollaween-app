import type { AppLocale } from "@/lib/i18n/locale";
import { formatMessage } from "@/lib/i18n/format";
import { messagesForLocale } from "@/lib/i18n/translate";
import type { HouseAccessRegistrationKind } from "@/lib/night-pass-copy";
import type { NightPassLostDetail } from "@/lib/night-pass-client";

export function nightPassEventRegisteredBody(
  locale: AppLocale,
  houseName: string,
  kind: HouseAccessRegistrationKind = "owner",
): string {
  const m = messagesForLocale(locale).nightPass;
  const name = houseName.trim() || m.eventRegisteredBodyFallback;
  if (kind === "editor") {
    return formatMessage(m.eventRegisteredBodyEditor, { houseName: name });
  }
  return formatMessage(m.eventRegisteredBodyOwner, { houseName: name });
}

export function nightPassLostMessage(locale: AppLocale, detail: NightPassLostDetail): string {
  const m = messagesForLocale(locale).nightPass;
  if (detail?.reason === "house_removed") return m.lostHouseRemoved;
  if (detail?.reason === "removed") return m.lostRemoved;
  if (detail?.reason === "reset") return m.lostReset;
  if (detail?.reason === "taken") return m.lostTaken;
  return m.lostDefault;
}

export function nightPassLostDescription(
  locale: AppLocale,
  detail: NightPassLostDetail,
): string | undefined {
  const m = messagesForLocale(locale).nightPass;
  if (detail?.reason === "house_removed") return undefined;
  if (detail?.reason === "removed") return m.lostDescRemoved;
  if (detail?.reason === "reset") return m.lostDescReset;
  return undefined;
}
