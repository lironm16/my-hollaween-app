import {
  houseInNeighborhoods,
  NEIGHBORHOOD_FILTER_OPTIONS,
  resolveNeighborhood,
} from "@/lib/config";
import { isStubHouse } from "@/lib/house-set";
import type { FilterMismatchReason } from "@/lib/i18n/filter-mismatch-copy";
import {
  localizeFilterMismatchReasons,
} from "@/lib/i18n/filter-mismatch-copy";
import type { AppLocale } from "@/lib/i18n/locale";
import { resolveVisitWindow } from "@/lib/visit-window";
import {
  hasValidVisitWindow,
  isAfterHoursForFilter,
  isClosingSoonForFilter,
  isHoursNightOver,
  isNotYetOpenForFilter,
  isOnBreakForFilter,
  isOpenDuringCustomVisitForFilter,
  isOpenNowForFilter,
  isOpeningSoonForFilter,
} from "@/lib/hours";
import { candyTone } from "@/components/candy-glyphs";
import { houseMatchesLocationKind } from "@/lib/house-kind";
import { effectiveVisit, isDecorated, offersSensitivity } from "@/lib/house-state";
import { houseMatchesSet, type HouseSet } from "@/lib/house-set";
import type { HouseFiltersState } from "@/lib/offline-db";
import { isHouseClosedBeforeOpening } from "@/lib/hours";
import { CANDY_TONE_IDS, SCARE_LEVELS, type AddressRevealSchedule, type PublicHouse } from "@/lib/types";

export function isHouseOwnerClosed(house: PublicHouse) {
  return effectiveVisit(house) === "closed";
}

export function isHouseClosedForDisplay(
  house: PublicHouse,
  now: Date,
  addressReveal?: AddressRevealSchedule,
) {
  return (
    isHouseOwnerClosed(house) ||
    isHoursNightOver(house, now) ||
    isHouseClosedBeforeOpening(house, now, addressReveal)
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
  return filters.neighborhoodFilters.length !== NEIGHBORHOOD_FILTER_OPTIONS.length;
}

/** Why a house is faded on the map (not in the active filter). */
export function houseFilterMismatchReasonEntries(
  house: PublicHouse,
  filters: HouseFiltersState,
  options: {
    houseSet: HouseSet;
    likedIds: string[];
    visitedIds: string[];
    skippedIds?: string[];
    gemCollectedIds?: string[];
    now: Date;
  },
): FilterMismatchReason[] {
  const reasons: FilterMismatchReason[] = [];
  const { houseSet, likedIds, visitedIds, skippedIds = [], gemCollectedIds = [], now } = options;
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
    uncollectedGemOnly,
    includeUndecorated,
    locationKindFilter,
  } = filters;
  const {
    from: visitWindowFrom,
    to: visitWindowTo,
    mode: visitWindowMode,
  } = resolveVisitWindow(filters, now);

  if (!houseMatchesSet(house, houseSet)) {
    reasons.push(isStubHouse(house) ? { kind: "stub" } : { kind: "realHouse" });
  }
  const kindFilter = locationKindFilter ?? "all";
  if (!houseMatchesLocationKind(house, kindFilter)) {
    reasons.push(kindFilter === "house" ? { kind: "poi" } : { kind: "house" });
  }
  if (accessibleOnly && !house.accessible) reasons.push({ kind: "notAccessible" });
  if (candyFilterActive(filters)) {
    if (candyFilters.length === 0) reasons.push({ kind: "candyFilter" });
    else if (!candyFilters.includes(candyTone(house))) {
      reasons.push({ kind: "candyTone", tone: candyTone(house) });
    }
  }
  if (!includeUndecorated && !isDecorated(house)) reasons.push({ kind: "notDecorated" });
  if (visitWindowMode === "now" && !isOpenNowForFilter(house, "", "", now)) {
    reasons.push({ kind: "notOpenNow" });
  } else if (
    visitWindowMode === "custom" &&
    hasValidVisitWindow(visitWindowFrom, visitWindowTo) &&
    !isOpenDuringCustomVisitForFilter(house, visitWindowFrom, visitWindowTo, now)
  ) {
    reasons.push({ kind: "outsideHours" });
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
      if (closingSoonOnly) reasons.push({ kind: "notClosingSoon" });
      else if (openingSoonOnly) reasons.push({ kind: "notOpeningSoon" });
      else if (notYetOpenOnly) reasons.push({ kind: "alreadyOpen" });
      else if (onBreakOnly) reasons.push({ kind: "notOnBreak" });
      else if (afterHoursOnly) reasons.push({ kind: "notAfterHours" });
      else reasons.push({ kind: "notOpenNow" });
    }
  }
  if (closedOnly && !isHouseOwnerClosed(house)) reasons.push({ kind: "notClosed" });
  if (decorOnlyOnly && !isHouseDecorOnly(house)) reasons.push({ kind: "notDecorOnly" });
  for (const sensitivity of sensitivityFilters) {
    if (!offersSensitivity(house, sensitivity)) {
      reasons.push({ kind: "sensitivity", id: sensitivity });
    }
  }
  if (scareFilterActive(filters) && isDecorated(house)) {
    if (scareFilters.length === 0) reasons.push({ kind: "scareFilter" });
    else if (!scareFilters.includes(house.scareLevel)) {
      reasons.push({ kind: "scareLevel", level: house.scareLevel });
    }
  }
  if (neighborhoodFilterActive(filters) && !houseInNeighborhoods(house, neighborhoodFilters)) {
    const area = resolveNeighborhood(house);
    reasons.push({ kind: "neighborhood", name: area ?? "" });
  }
  if (likedOnly && !likedIds.includes(house.id)) reasons.push({ kind: "notLiked" });
  if (unvisitedOnly && visitedIds.includes(house.id)) reasons.push({ kind: "alreadyVisited" });
  if (visitedOnly && !visitedIds.includes(house.id)) reasons.push({ kind: "notVisited" });
  if (skippedIds.includes(house.id)) reasons.push({ kind: "skipped" });
  if (skippedOnly && !skippedIds.includes(house.id)) reasons.push({ kind: "notSkipped" });
  if (uncollectedGemOnly && gemCollectedIds.includes(house.id)) {
    reasons.push({ kind: "gemAlreadyCollected" });
  }

  return reasons;
}

/** Localized short labels for filter mismatch (map fade, house cards). */
export function houseFilterMismatchReasons(
  house: PublicHouse,
  filters: HouseFiltersState,
  options: {
    houseSet: HouseSet;
    likedIds: string[];
    visitedIds: string[];
    skippedIds?: string[];
    gemCollectedIds?: string[];
    now: Date;
  },
  locale: AppLocale = "he",
): string[] {
  return localizeFilterMismatchReasons(
    locale,
    houseFilterMismatchReasonEntries(house, filters, options),
  );
}

export function filterHouses(
  houses: PublicHouse[],
  filters: HouseFiltersState,
  options: {
    houseSet: HouseSet;
    likedIds: string[];
    visitedIds: string[];
    skippedIds?: string[];
    gemCollectedIds?: string[];
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
    uncollectedGemOnly,
    includeUndecorated,
    locationKindFilter,
  } = filters;
  const { houseSet, likedIds, visitedIds, skippedIds = [], gemCollectedIds = [], now } = options;
  const {
    from: visitWindowFrom,
    to: visitWindowTo,
    mode: visitWindowMode,
  } = resolveVisitWindow(filters, now);
  return houses.filter((house) => {
    if (!houseMatchesSet(house, houseSet)) return false;
    if (!houseMatchesLocationKind(house, locationKindFilter ?? "all")) return false;
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
    if (uncollectedGemOnly && gemCollectedIds.includes(house.id)) return false;
    return true;
  });
}

export function routeHouseIds(route: { stops: { houses: { id: string }[] }[] } | null) {
  if (!route) return new Set<string>();
  return new Set(route.stops.flatMap((stop) => stop.houses.map((house) => house.id)));
}
