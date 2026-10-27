import { formatMessage } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";
import { houseHeadline } from "@/lib/labels";
import type { HouseFiltersState, SkippedHouseMeta } from "@/lib/offline-db";
import {
  metaRestoreTriggers,
  suggestedSkipReasons,
  type SkipReasonId,
  type TemporaryRestoreTriggerId,
} from "@/lib/skip-reasons";
import type { PublicHouse } from "@/lib/types";

function t(locale: AppLocale, path: string) {
  return translate(locale, path);
}

export function localizedTemporaryRestoreOptionLabel(
  locale: AppLocale,
  id: TemporaryRestoreTriggerId,
): string {
  if (id === "not-open") return t(locale, "skipDialog.restoreWhenOpen");
  return t(locale, "skipDialog.restoreWhenCandy");
}

export function localizedSkipReturnOfferLabel(
  locale: AppLocale,
  trigger: TemporaryRestoreTriggerId,
): string {
  if (trigger === "candy-out") return t(locale, "skipRestore.returnWhenCandy");
  return t(locale, "skipRestore.returnWhenOpen");
}

export function localizedSkipMetaSummary(locale: AppLocale, meta: SkippedHouseMeta): string {
  const triggers = metaRestoreTriggers(meta);
  if (meta.temporary && triggers.length > 0) {
    const parts = triggers.map((trigger) => {
      if (trigger === "not-open") return t(locale, "skipRestore.triggerOpen");
      return t(locale, "skipRestore.triggerCandy");
    });
    const joiner = locale === "en" ? " and " : " ו";
    return formatMessage(t(locale, "skipRestore.metaTemporary"), { parts: parts.join(joiner) });
  }
  return t(locale, "skipRestore.metaSkipped");
}

export function localizedSkipRestoreUndoPromptMessage(
  locale: AppLocale,
  house: PublicHouse,
  meta: SkippedHouseMeta,
): string {
  const name = houseHeadline(house);
  const trigger = metaRestoreTriggers(meta)[0];
  if (trigger === "not-open") {
    return formatMessage(t(locale, "skipRestore.promptOpen"), { name });
  }
  if (trigger === "candy-out") {
    return formatMessage(t(locale, "skipRestore.promptCandy"), { name });
  }
  return formatMessage(t(locale, "skipRestore.promptGeneric"), { name });
}

const SKIP_REASON_LABEL_KEYS: Record<SkipReasonId, string> = {
  closed: "skipReason.labelClosed",
  break: "skipReason.labelBreak",
  "candy-out": "skipReason.labelCandyOut",
  "candy-low": "skipReason.labelCandyLow",
  "not-open": "skipReason.labelNotOpen",
  scary: "skipReason.labelScary",
  "decor-only": "skipReason.labelDecorOnly",
  other: "skipReason.labelOther",
};

const SUGGESTED_SKIP_KEYS: Record<SkipReasonId, string> = {
  closed: "skipReason.suggestedClosed",
  break: "skipReason.suggestedBreak",
  "candy-out": "skipReason.suggestedCandyOut",
  "candy-low": "skipReason.suggestedCandyLow",
  "not-open": "skipReason.suggestedNotOpen",
  scary: "skipReason.suggestedScary",
  "decor-only": "skipReason.suggestedDecorOnly",
  other: "skipReason.suggestedOther",
};

export function localizedSkipReasonLabel(locale: AppLocale, reason: SkipReasonId): string {
  return t(locale, SKIP_REASON_LABEL_KEYS[reason]);
}

export function localizedSuggestedSkipReasons(
  locale: AppLocale,
  house: PublicHouse,
  now: Date,
  filters: HouseFiltersState,
) {
  const options = suggestedSkipReasons(house, now, filters);
  return options.map((option) => ({
    ...option,
    label:
      option.id === "other" && options.length > 1
        ? t(locale, "skipReason.suggestedOtherAlt")
        : t(locale, SUGGESTED_SKIP_KEYS[option.id]),
  }));
}

export function localizedTemporaryRestoreAlertText(
  locale: AppLocale,
  house: PublicHouse,
  meta: SkippedHouseMeta,
): string {
  const name = houseHeadline(house);
  const triggers = metaRestoreTriggers(meta);
  if (triggers.includes("not-open") && triggers.includes("candy-out")) {
    return formatMessage(t(locale, "skipRestore.alertOpenAndCandy"), { name });
  }
  if (triggers.includes("not-open")) {
    return formatMessage(t(locale, "skipRestore.alertOpen"), { name });
  }
  if (triggers.includes("candy-out")) {
    return formatMessage(t(locale, "skipRestore.alertCandy"), { name });
  }
  return formatMessage(t(locale, "skipRestore.alertGeneric"), { name });
}
