import type { AppLocale } from "@/lib/i18n/locale";
import { formatMessage } from "@/lib/i18n/format";
import { messagesForLocale } from "@/lib/i18n/translate";
import { HOUSE_ACCESS_CODE_LENGTH } from "@/lib/night-pass-copy";

/** Common placeholders for help / FAQ strings. */
export function helpVars(locale: AppLocale): Record<string, string> {
  const p = messagesForLocale(locale).help.product;
  return {
    codeLength: String(HOUSE_ACCESS_CODE_LENGTH),
    bannerCta: p.nightPassBannerCta,
    revealHint: p.nightPassRevealHint,
    gameTitle: p.gemGameTitle,
    albumTitle: p.gemAlbumTitle,
    placeAction: p.gemPlaceAction,
    placeHint: p.gemPlaceHint,
    placeSave: p.gemPlaceSave,
    foundCheer: p.gemFoundCheer,
    foundI: p.gemFoundI,
    notFoundI: p.gemNotFoundI,
  };
}

export function formatHelp(locale: AppLocale, template: string, extra?: Record<string, string>): string {
  return formatMessage(template, { ...helpVars(locale), ...extra });
}
