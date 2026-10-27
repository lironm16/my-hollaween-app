import { formatMessage } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";
import { houseHeadline } from "@/lib/labels";
import type { SkippedHouseMeta } from "@/lib/offline-db";
import {
  metaRestoreTriggers,
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
