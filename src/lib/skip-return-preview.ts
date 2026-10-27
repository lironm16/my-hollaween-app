import { localizedSkipReturnOfferLabel } from "@/lib/i18n/skip-copy";
import type { AppLocale } from "@/lib/i18n/locale";
import type { SkippedHouseMeta } from "@/lib/offline-db";
import {
  metaRestoreTriggers,
  primaryRestoreTriggerFromSnapshot,
  skipReturnOfferEligible,
  skipReturnRuleActive,
} from "@/lib/skip-reasons";

export function skipReturnPreviewLine(
  locale: AppLocale,
  meta: SkippedHouseMeta | undefined,
): string | null {
  if (!meta || !skipReturnOfferEligible(meta)) return null;
  const trigger = primaryRestoreTriggerFromSnapshot(meta.statusKey);
  return trigger ? localizedSkipReturnOfferLabel(locale, trigger) : null;
}

/** List/map preview — only when the user turned the return switch on. */
export function skipReturnActivePreviewLine(
  locale: AppLocale,
  meta: SkippedHouseMeta | undefined,
): string | null {
  if (!meta || !skipReturnRuleActive(meta)) return null;
  const trigger = metaRestoreTriggers(meta)[0];
  return trigger ? localizedSkipReturnOfferLabel(locale, trigger) : null;
}
