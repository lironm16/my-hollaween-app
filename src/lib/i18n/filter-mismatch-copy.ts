import type { CandyTone, ScareLevel, SensitivityId } from "@/lib/types";
import type { AppLocale } from "@/lib/i18n/locale";
import { displayNeighborhoodName } from "@/lib/i18n/neighborhood-labels";
import { localizedTreatLabel } from "@/lib/i18n/treat-labels";
import { translate } from "@/lib/i18n/translate";

export type FilterMismatchReason =
  | { kind: "stub" }
  | { kind: "realHouse" }
  | { kind: "poi" }
  | { kind: "house" }
  | { kind: "notAccessible" }
  | { kind: "candyFilter" }
  | { kind: "candyTone"; tone: CandyTone }
  | { kind: "notDecorated" }
  | { kind: "notOpenNow" }
  | { kind: "outsideHours" }
  | { kind: "notClosingSoon" }
  | { kind: "notOpeningSoon" }
  | { kind: "alreadyOpen" }
  | { kind: "notOnBreak" }
  | { kind: "notAfterHours" }
  | { kind: "notClosed" }
  | { kind: "notDecorOnly" }
  | { kind: "sensitivity"; id: SensitivityId }
  | { kind: "scareFilter" }
  | { kind: "scareLevel"; level: ScareLevel }
  | { kind: "neighborhood"; name: string }
  | { kind: "notLiked" }
  | { kind: "alreadyVisited" }
  | { kind: "notVisited" }
  | { kind: "skipped" }
  | { kind: "notSkipped" }
  | { kind: "gemAlreadyCollected" };

function t(locale: AppLocale, path: string) {
  return translate(locale, path);
}

function candyToneLabel(locale: AppLocale, tone: CandyTone): string {
  if (tone === "plenty") return t(locale, "labels.candyPlenty");
  if (tone === "low") return t(locale, "labels.candyLow");
  return t(locale, "labels.candyOut");
}

function scareLevelLabel(locale: AppLocale, level: ScareLevel): string {
  if (level === "mild") return t(locale, "labels.scareMild");
  if (level === "medium") return t(locale, "labels.scareMedium");
  return t(locale, "labels.scareSpicy");
}

export function localizeFilterMismatchReason(
  locale: AppLocale,
  reason: FilterMismatchReason,
): string {
  switch (reason.kind) {
    case "stub":
      return t(locale, "filterMismatch.stub");
    case "realHouse":
      return t(locale, "filterMismatch.realHouse");
    case "poi":
      return t(locale, "labels.houseKindPoi");
    case "house":
      return t(locale, "labels.houseKindHouse");
    case "notAccessible":
      return t(locale, "filterMismatch.notAccessible");
    case "candyFilter":
      return t(locale, "filterMismatch.candyFilter");
    case "candyTone":
      return candyToneLabel(locale, reason.tone);
    case "notDecorated":
      return t(locale, "filterMismatch.notDecorated");
    case "notOpenNow":
      return t(locale, "filterMismatch.notOpenNow");
    case "outsideHours":
      return t(locale, "filterMismatch.outsideHours");
    case "notClosingSoon":
      return t(locale, "filterMismatch.notClosingSoon");
    case "notOpeningSoon":
      return t(locale, "filterMismatch.notOpeningSoon");
    case "alreadyOpen":
      return t(locale, "filterMismatch.alreadyOpen");
    case "notOnBreak":
      return t(locale, "filterMismatch.notOnBreak");
    case "notAfterHours":
      return t(locale, "filterMismatch.notAfterHours");
    case "notClosed":
      return t(locale, "filterMismatch.notClosed");
    case "notDecorOnly":
      return t(locale, "filterMismatch.notDecorOnly");
    case "sensitivity":
      return localizedTreatLabel(locale, reason.id);
    case "scareFilter":
      return t(locale, "filterMismatch.scareFilter");
    case "scareLevel":
      return scareLevelLabel(locale, reason.level);
    case "neighborhood":
      return displayNeighborhoodName(locale, reason.name || null);
    case "notLiked":
      return t(locale, "filterMismatch.notLiked");
    case "alreadyVisited":
      return t(locale, "filterMismatch.alreadyVisited");
    case "notVisited":
      return t(locale, "filterMismatch.notVisited");
    case "skipped":
      return t(locale, "filterMismatch.skipped");
    case "notSkipped":
      return t(locale, "filterMismatch.notSkipped");
    case "gemAlreadyCollected":
      return t(locale, "filterMismatch.gemAlreadyCollected");
    default:
      return "";
  }
}

export function localizeFilterMismatchReasons(
  locale: AppLocale,
  reasons: FilterMismatchReason[],
): string[] {
  return reasons.map((reason) => localizeFilterMismatchReason(locale, reason));
}

export function filterMismatchIncludesSkipped(reasons: FilterMismatchReason[]) {
  return reasons.some((reason) => reason.kind === "skipped");
}
