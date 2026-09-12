import { candyPinDot, effectiveVisit, isOwnerFrozen } from "@/lib/house-state";
import { isOnBreak, isOpenNowForFilter } from "@/lib/hours";
import type { HouseFiltersState } from "@/lib/offline-db";
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

export type SkippedHouseMeta = {
  reason: SkipReasonId;
  temporary: boolean;
  statusKey: string;
  skippedAt: string;
};

/** Snapshot house status at skip time — used for temporary skip auto-restore. */
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

export function isTemporarySkipReason(reason: SkipReasonId) {
  return reason !== "other" && reason !== "scary";
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
