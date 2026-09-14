import { candyToneLabel } from "@/components/candy-glyphs";
import {
  houseInNeighborhoods,
  NEIGHBORHOODS,
  neighborhoodFromAddress,
  resolveNeighborhood,
} from "@/lib/config";
import { isStubHouse } from "@/lib/house-set";
import { scareShort, treatLabels } from "@/lib/labels";
import { resolveVisitWindow } from "@/lib/visit-window";
import {
  hasValidVisitWindow,
  isAfterHoursForFilter,
  isClosingSoonForFilter,
  isHoursNightOver,
  isHoursNotYetOpen,
  isNotYetOpenForFilter,
  isOnBreakForFilter,
  isOpenDuringCustomVisitForFilter,
  isOpenNowForFilter,
  isOpeningSoonForFilter,
} from "@/lib/hours";
import { candyTone } from "@/components/candy-glyphs";
import { effectiveVisit, isDecorated, offersSensitivity } from "@/lib/house-state";
import { houseMatchesSet, type HouseSet } from "@/lib/house-set";
import type { HouseFiltersState } from "@/lib/offline-db";
import { CANDY_TONE_IDS, SCARE_LEVELS, type PublicHouse } from "@/lib/types";

export function isHouseOwnerClosed(house: PublicHouse) {
  return effectiveVisit(house) === "closed";
}

export function isHouseClosedForDisplay(house: PublicHouse, now: Date) {
  return (
    isHouseOwnerClosed(house) ||
    isHoursNightOver(house, now) ||
    isHoursNotYetOpen(house, now)
  );
}


export function isHouseDecorOnly(house: PublicHouse) {
  return effectiveVisit(house) === "decorOnly";
}

function candyFilterActive(filters: HouseFiltersState) {
  return !(
    filters.candyFilters.length === CANDY_TONE_IDS.length &&
    CANDY_TONE_IDS.every((tone) => filters.candyFilters.includes(tone))
  );
}

function scareFilterActive(filters: HouseFiltersState) {
  return !(
    filters.includeUndecorated &&
    filters.scareFilters.length === SCARE_LEVELS.length &&
    SCARE_LEVELS.every((level) => filters.scareFilters.includes(level))
  );
}

function neighborhoodFilterActive(filters: HouseFiltersState) {
  return filters.neighborhoodFilters.length !== NEIGHBORHOODS.length;
}

/** Short Hebrew labels for why a house is faded on the map (not in the active filter). */
export function houseFilterMismatchReasons(
  house: PublicHouse,
  filters: HouseFiltersState,
  options: {
    houseSet: HouseSet;
    likedIds: string[];
    visitedIds: string[];
    skippedIds?: string[];
    now: Date;
  },
): string[] {
  const reasons: string[] = [];
  const { houseSet, likedIds, visitedIds, skippedIds = [], now } = options;
  const {
    accessibleOnly,
    openNowOnly,
    closingSoonOnly,
    openingSoonOnly,
    notYetOpenOnly,
    onBreakOnly,
    afterHoursOnly,
    closedOnly,
    decorOnlyOnly,
    sensitivityFilters,
    scareFilters,
    candyFilters,
    neighborhoodFilters,
    likedOnly,
    unvisitedOnly,
    visitedOnly,
    skippedOnly,
    includeUndecorated,
  } = filters;
  const {
    from: visitWindowFrom,
    to: visitWindowTo,
    mode: visitWindowMode,
  } = resolveVisitWindow(filters, now);

  if (!houseMatchesSet(house, houseSet)) {
    reasons.push(isStubHouse(house) ? "סטאב" : "בית אמיתי");
  }
  if (accessibleOnly && !house.accessible) reasons.push("לא נגיש");
  if (candyFilterActive(filters)) {
    if (candyFilters.length === 0) reasons.push("ממתקים");
    else if (!candyFilters.includes(candyTone(house))) reasons.push(candyToneLabel(candyTone(house)));
  }
  if (!includeUndecorated && !isDecorated(house)) reasons.push("לא מקושט");
  if (visitWindowMode === "now" && !isOpenNowForFilter(house, "", "", now)) {
    reasons.push("לא פתוח עכשיו");
  } else if (
    visitWindowMode === "custom" &&
    hasValidVisitWindow(visitWindowFrom, visitWindowTo) &&
    !isOpenDuringCustomVisitForFilter(house, visitWindowFrom, visitWindowTo, now)
  ) {
    reasons.push("מחוץ לשעות");
  }
  if (
    openNowOnly ||
    closingSoonOnly ||
    openingSoonOnly ||
    notYetOpenOnly ||
    onBreakOnly ||
    afterHoursOnly
  ) {
    const hoursHit =
      (openNowOnly && isOpenNowForFilter(house, visitWindowFrom, visitWindowTo, now)) ||
      (closingSoonOnly && isClosingSoonForFilter(house, visitWindowFrom, visitWindowTo, now)) ||
      (openingSoonOnly && isOpeningSoonForFilter(house, visitWindowFrom, visitWindowTo, now)) ||
      (notYetOpenOnly && isNotYetOpenForFilter(house, visitWindowFrom, visitWindowTo, now)) ||
      (onBreakOnly && isOnBreakForFilter(house, visitWindowFrom, visitWindowTo, now)) ||
      (afterHoursOnly && isAfterHoursForFilter(house, visitWindowFrom, visitWindowTo, now));
    if (!hoursHit) {
      if (closingSoonOnly) reasons.push("לא נסגר בקרוב");
      else if (openingSoonOnly) reasons.push("לא נפתח בקרוב");
      else if (notYetOpenOnly) reasons.push("כבר פתוח");
      else if (onBreakOnly) reasons.push("לא בהפסקה");
      else if (afterHoursOnly) reasons.push("לא אחרי שעות");
      else reasons.push("לא פתוח עכשיו");
    }
  }
  if (closedOnly && !isHouseOwnerClosed(house)) reasons.push("לא סגור");
  if (decorOnlyOnly && !isHouseDecorOnly(house)) reasons.push("לא קישוט בלבד");
  for (const sensitivity of sensitivityFilters) {
    if (!offersSensitivity(house, sensitivity)) {
      reasons.push(treatLabels[sensitivity]);
    }
  }
  if (scareFilterActive(filters) && isDecorated(house)) {
    if (scareFilters.length === 0) reasons.push("רמת פחד");
    else if (!scareFilters.includes(house.scareLevel)) reasons.push(scareShort[house.scareLevel]);
  }
  if (neighborhoodFilterActive(filters) && !houseInNeighborhoods(house, neighborhoodFilters)) {
    const area =
      resolveNeighborhood(house) ??
      (house.address ? neighborhoodFromAddress(house.address) : null);
    reasons.push(area ?? "שכונה אחרת");
  }
  if (likedOnly && !likedIds.includes(house.id)) reasons.push("לא בשמורים");
  if (unvisitedOnly && visitedIds.includes(house.id)) reasons.push("כבר ביקרת");
  if (visitedOnly && !visitedIds.includes(house.id)) reasons.push("לא ביקרת");
  if (skippedIds.includes(house.id)) reasons.push("דילגתם על הבית");
  if (skippedOnly && !skippedIds.includes(house.id)) reasons.push("לא דילגתם");

  return reasons;
}

export function filterHouses(
  houses: PublicHouse[],
  filters: HouseFiltersState,
  options: {
    houseSet: HouseSet;
    likedIds: string[];
    visitedIds: string[];
    skippedIds?: string[];
    now: Date;
  },
): PublicHouse[] {
  const {
    accessibleOnly,
    openNowOnly,
    closingSoonOnly,
    openingSoonOnly,
    notYetOpenOnly,
    onBreakOnly,
    afterHoursOnly,
    closedOnly,
    decorOnlyOnly,
    sensitivityFilters,
    scareFilters,
    candyFilters,
    neighborhoodFilters,
    likedOnly,
    unvisitedOnly,
    visitedOnly,
    skippedOnly,
    includeUndecorated,
  } = filters;
  const { houseSet, likedIds, visitedIds, skippedIds = [], now } = options;
  const {
    from: visitWindowFrom,
    to: visitWindowTo,
    mode: visitWindowMode,
  } = resolveVisitWindow(filters, now);
  return houses.filter((house) => {
    if (!houseMatchesSet(house, houseSet)) return false;
    if (accessibleOnly && !house.accessible) return false;
    if (candyFilterActive(filters)) {
      if (candyFilters.length === 0 || !candyFilters.includes(candyTone(house))) return false;
    }
    if (!includeUndecorated && !isDecorated(house)) return false;
    if (visitWindowMode === "now") {
      if (!isOpenNowForFilter(house, "", "", now)) return false;
    } else if (
      visitWindowMode === "custom" &&
      hasValidVisitWindow(visitWindowFrom, visitWindowTo)
    ) {
      if (!isOpenDuringCustomVisitForFilter(house, visitWindowFrom, visitWindowTo, now)) {
        return false;
      }
    }
    if (
      openNowOnly ||
      closingSoonOnly ||
      openingSoonOnly ||
      notYetOpenOnly ||
      onBreakOnly ||
      afterHoursOnly
    ) {
      const hoursHit =
        (openNowOnly && isOpenNowForFilter(house, visitWindowFrom, visitWindowTo, now)) ||
        (closingSoonOnly && isClosingSoonForFilter(house, visitWindowFrom, visitWindowTo, now)) ||
        (openingSoonOnly && isOpeningSoonForFilter(house, visitWindowFrom, visitWindowTo, now)) ||
        (notYetOpenOnly && isNotYetOpenForFilter(house, visitWindowFrom, visitWindowTo, now)) ||
        (onBreakOnly && isOnBreakForFilter(house, visitWindowFrom, visitWindowTo, now)) ||
        (afterHoursOnly && isAfterHoursForFilter(house, visitWindowFrom, visitWindowTo, now));
      if (!hoursHit) return false;
    }
    if (closedOnly || decorOnlyOnly) {
      const statusHit =
        (closedOnly && isHouseOwnerClosed(house)) ||
        (decorOnlyOnly && isHouseDecorOnly(house));
      if (!statusHit) return false;
    }
    for (const sensitivity of sensitivityFilters) {
      if (!offersSensitivity(house, sensitivity)) return false;
    }
    if (scareFilterActive(filters) && isDecorated(house)) {
      if (scareFilters.length === 0 || !scareFilters.includes(house.scareLevel)) return false;
    }
    if (!houseInNeighborhoods(house, neighborhoodFilters)) return false;
    if (likedOnly && !likedIds.includes(house.id)) return false;
    if (unvisitedOnly && visitedIds.includes(house.id)) return false;
    if (visitedOnly && !visitedIds.includes(house.id)) return false;
    if (skippedOnly && !skippedIds.includes(house.id)) return false;
    return true;
  });
}

export function routeHouseIds(route: { stops: { houses: { id: string }[] }[] } | null) {
  if (!route) return new Set<string>();
  return new Set(route.stops.flatMap((stop) => stop.houses.map((house) => house.id)));
}
