import { candyPinDot, effectiveVisit, isOwnerFrozen } from "@/lib/house-state";
import { isOnBreak, isOpenNowForFilter } from "@/lib/hours";
import { houseHeadline } from "@/lib/labels";
import type { HouseFiltersState, SkippedHouseMeta } from "@/lib/offline-db";
import { resolveVisitWindow } from "@/lib/visit-window";
import type { PublicHouse } from "@/lib/types";

export type SkipReasonId =
  | "closed"
  | "break"
  | "candy-out"
  | "candy-low"
  | "not-open"
  | "scary"
  | "decor-only"
  | "other";

export type SkipReasonOption = {
  id: SkipReasonId;
  label: string;
};

export type TemporaryRestoreTriggerId = "not-open" | "candy-out";

/** Fixed restore triggers shown in the skip dialog. */
export const TEMPORARY_RESTORE_OPTIONS: SkipReasonOption[] = [
  { id: "not-open", label: "הבית יחזור כאשר הוא פתוח" },
  { id: "candy-out", label: "הבית יחזור כאשר יש ממתקים" },
];

/** Snapshot house status at skip time — kept for debugging and future use. */
export function skipStatusSnapshot(
  house: PublicHouse,
  now: Date,
  filters: HouseFiltersState,
): string {
  const { from, to } = resolveVisitWindow(filters, now);
  const candy = candyPinDot(house);
  return [
    effectiveVisit(house),
    isOwnerFrozen(house, now.getTime()) ? "frozen" : "active",
    isOnBreak(house, now) ? "break" : "active",
    isOpenNowForFilter(house, from, to, now) ? "open" : "closed-hours",
    candy ?? "no-candy",
    house.scareLevel ?? "mild",
  ].join("|");
}

export function isTemporarySkipReason(reason: SkipReasonId): reason is TemporaryRestoreTriggerId {
  return reason === "not-open" || reason === "candy-out";
}

export function metaRestoreTriggers(meta: SkippedHouseMeta): TemporaryRestoreTriggerId[] {
  if (meta.restoreTriggers?.length) {
    return meta.restoreTriggers.filter(isTemporarySkipReason);
  }
  if (meta.temporary && isTemporarySkipReason(meta.reason)) return [meta.reason];
  return [];
}

/** Whether the house is open enough to visit right now. */
export function isHouseOpenForSkip(house: PublicHouse, now: Date, filters: HouseFiltersState) {
  const { from, to } = resolveVisitWindow(filters, now);
  const visit = effectiveVisit(house);
  if (visit === "closed") return false;
  if (isOnBreak(house, now) || isOwnerFrozen(house, now.getTime())) return false;
  return isOpenNowForFilter(house, from, to, now);
}

/** Whether the house currently lacks candy (out or low). */
export function houseLacksCandy(house: PublicHouse) {
  const candy = candyPinDot(house);
  return candy === "out" || candy === "low";
}

/** Whether the house currently has candy available. */
export function houseHasCandy(house: PublicHouse) {
  const candy = candyPinDot(house);
  return candy === "plenty" || candy === "low";
}

/** Restore triggers that make sense for the house's current state. */
export function availableTemporaryRestoreOptions(
  house: PublicHouse,
  now: Date,
  filters: HouseFiltersState,
): SkipReasonOption[] {
  const options: SkipReasonOption[] = [];
  if (!isHouseOpenForSkip(house, now, filters)) {
    options.push(TEMPORARY_RESTORE_OPTIONS[0]);
  }
  if (houseLacksCandy(house)) {
    options.push(TEMPORARY_RESTORE_OPTIONS[1]);
  }
  return options;
}

/** Whether one temporary restore trigger is now met. */
export function temporaryRestoreReasonMet(
  house: PublicHouse,
  reason: SkipReasonId,
  now: Date,
  filters: HouseFiltersState,
) {
  if (reason === "not-open") return isHouseOpenForSkip(house, now, filters);
  if (reason === "candy-out") return houseHasCandy(house);
  return false;
}

/** Whether every selected restore trigger for a temporary skip is now met. */
export function temporarySkipRestoreMet(
  house: PublicHouse,
  meta: SkippedHouseMeta,
  now: Date,
  filters: HouseFiltersState,
) {
  const triggers = metaRestoreTriggers(meta);
  if (!meta.temporary || triggers.length === 0) return false;
  return triggers.every((trigger) => temporaryRestoreReasonMet(house, trigger, now, filters));
}

export function temporaryRestoreReasonLabel(reason: SkipReasonId) {
  if (reason === "not-open") return "הבית פתוח";
  if (reason === "candy-out") return "יש ממתקים";
  return "";
}

export function skipMetaSummary(meta: SkippedHouseMeta) {
  const triggers = metaRestoreTriggers(meta);
  if (meta.temporary && triggers.length > 0) {
    const parts = triggers.map((trigger) => temporaryRestoreReasonLabel(trigger));
    return `דילוג זמני · החזרה כש${parts.join(" ו")}`;
  }
  return "דילגתם על הבית";
}

export function temporaryRestoreAlertText(house: PublicHouse, meta: SkippedHouseMeta) {
  const name = houseHeadline(house);
  const triggers = metaRestoreTriggers(meta);
  if (triggers.includes("not-open") && triggers.includes("candy-out")) {
    return `${name} חזר לרשימה — הבית פתוח ויש ממתקים`;
  }
  if (triggers.includes("not-open")) return `${name} חזר לרשימה — הבית פתוח`;
  if (triggers.includes("candy-out")) return `${name} חזר לרשימה — יש ממתקים`;
  return `${name} חזר לרשימה`;
}

/** Whether the house was closed or out of candy when the skip was recorded. */
export function skipSnapshotHadCandyOutOrClosed(statusKey: string) {
  const [visit, frozen, breakStatus, hoursOpen, candy] = statusKey.split("|");
  if (visit === "closed") return true;
  if (frozen === "frozen" || breakStatus === "break") return true;
  if (hoursOpen === "closed-hours") return true;
  if (candy === "out") return true;
  return false;
}

/** Temporary auto-restore still runs silently unless candy or closed status triggered the skip. */
export function shouldEmitTemporarySkipRestoreAlert(meta: SkippedHouseMeta) {
  if (!meta.temporary || !isTemporarySkipReason(meta.reason)) return false;
  return skipSnapshotHadCandyOutOrClosed(meta.statusKey);
}

/** @deprecated Use availableTemporaryRestoreOptions instead. */
export function returnRestoreReasons(
  house: PublicHouse,
  now: Date,
  filters: HouseFiltersState,
): SkipReasonOption[] {
  return availableTemporaryRestoreOptions(house, now, filters);
}

export function suggestedSkipReasons(house: PublicHouse, now: Date, filters: HouseFiltersState) {
  const { from, to } = resolveVisitWindow(filters, now);
  const options: SkipReasonOption[] = [];
  const visit = effectiveVisit(house);
  const candy = candyPinDot(house);

  if (visit === "closed") {
    options.push({ id: "closed", label: "סגור / לא פעיל הלילה" });
  }
  if (isOnBreak(house, now) || isOwnerFrozen(house, now.getTime())) {
    options.push({ id: "break", label: "בהפסקה" });
  }
  if (candy === "out") {
    options.push({ id: "candy-out", label: "נגמרו ממתקים" });
  } else if (candy === "low") {
    options.push({ id: "candy-low", label: "נשארו מעט ממתקים" });
  }
  if (!isOpenNowForFilter(house, from, to, now) && visit !== "closed") {
    options.push({ id: "not-open", label: "לא פתוח עכשיו" });
  }
  if (visit === "decorOnly") {
    options.push({ id: "decor-only", label: "קישוט בלבד" });
  }
  if (house.scareLevel === "spicy" || house.scareLevel === "medium") {
    options.push({ id: "scary", label: "מפחיד מדי לנו" });
  }
  if (options.length === 0) {
    options.push({ id: "other", label: "לא מתאים לנו כרגע" });
  } else if (!options.some((item) => item.id === "other")) {
    options.push({ id: "other", label: "סיבה אחרת" });
  }
  return options;
}

export function skipReasonLabel(reason: SkipReasonId) {
  const labels: Record<SkipReasonId, string> = {
    closed: "סגור",
    break: "בהפסקה",
    "candy-out": "נגמרו ממתקים",
    "candy-low": "מעט ממתקים",
    "not-open": "לא פתוח",
    "scary": "מפחיד מדי",
    "decor-only": "קישוט בלבד",
    other: "דילגתי",
  };
  return labels[reason];
}
