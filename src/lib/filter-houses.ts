import { houseInNeighborhoods } from "@/lib/config";
import {
  hasVisitWindow,
  houseOpenDuringVisitWindow,
  isClosingSoon,
  isHoursNightOver,
  isHoursNotYetOpen,
  isOnBreak,
  isOpenNow,
  isOpeningSoon,
  resolveFilterNow,
} from "@/lib/hours";
import { candyTone } from "@/components/candy-glyphs";
import { effectiveVisit, isDecorated, isFrozen, offersSensitivity } from "@/lib/house-state";
import { houseMatchesSet, type HouseSet } from "@/lib/house-set";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";

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

export function isHouseNotYetOpenForDisplay(house: PublicHouse, now: Date) {
  if (isHouseOwnerClosed(house)) return false;
  return isHoursNotYetOpen(house, now);
}

export function isHouseAfterHoursForDisplay(house: PublicHouse, now: Date) {
  if (isHouseOwnerClosed(house)) return false;
  return isHoursNightOver(house, now);
}

export function isHouseOnBreakForDisplay(house: PublicHouse, now: Date) {
  if (isHouseOwnerClosed(house) || isHouseNotYetOpenForDisplay(house, now) || isHouseAfterHoursForDisplay(house, now)) {
    return false;
  }
  return isFrozen(house, now.getTime()) || isOnBreak(house, now);
}

export function isHouseDecorOnly(house: PublicHouse) {
  return effectiveVisit(house) === "decorOnly";
}

export function filterHouses(
  houses: PublicHouse[],
  filters: HouseFiltersState,
  options: {
    houseSet: HouseSet;
    likedIds: string[];
    visitedIds: string[];
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
    visitWindowFrom,
    visitWindowTo,
    includeUndecorated,
  } = filters;
  const { houseSet, likedIds, visitedIds, now } = options;
  const filterNow = resolveFilterNow(visitWindowFrom, visitWindowTo, now);
  return houses.filter((house) => {
    if (!houseMatchesSet(house, houseSet)) return false;
    if (accessibleOnly && !house.accessible) return false;
    if (candyFilters.length > 0 && !candyFilters.includes(candyTone(house))) return false;
    if (!includeUndecorated && !isDecorated(house)) return false;
    if (hasVisitWindow(visitWindowFrom, visitWindowTo)) {
      if (!houseOpenDuringVisitWindow(house, visitWindowFrom, visitWindowTo)) return false;
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
        (openNowOnly && isOpenNow(house, filterNow)) ||
        (closingSoonOnly && isClosingSoon(house, filterNow)) ||
        (openingSoonOnly && isOpeningSoon(house, filterNow)) ||
        (notYetOpenOnly && isHouseNotYetOpenForDisplay(house, filterNow)) ||
        (onBreakOnly && isHouseOnBreakForDisplay(house, filterNow)) ||
        (afterHoursOnly && isHouseAfterHoursForDisplay(house, filterNow));
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
    if (isDecorated(house) && scareFilters.length > 0 && !scareFilters.includes(house.scareLevel)) {
      return false;
    }
    if (!houseInNeighborhoods(house, neighborhoodFilters)) return false;
    if (likedOnly && !likedIds.includes(house.id)) return false;
    if (unvisitedOnly && visitedIds.includes(house.id)) return false;
    if (visitedOnly && !visitedIds.includes(house.id)) return false;
    return true;
  });
}

export function routeHouseIds(route: { stops: { houses: { id: string }[] }[] } | null) {
  if (!route) return new Set<string>();
  return new Set(route.stops.flatMap((stop) => stop.houses.map((house) => house.id)));
}
