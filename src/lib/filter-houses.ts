import { houseInNeighborhoods } from "@/lib/config";
import { resolveVisitWindow } from "@/lib/visit-window";
import {
  hasValidVisitWindow,
  isAfterHoursForFilter,
  isClosingSoonForFilter,
  isHoursNightOver,
  isHoursNotYetOpen,
  isNotYetOpenForFilter,
  isOnBreakForFilter,
  isOpenNowForFilter,
  isOpeningSoonForFilter,
} from "@/lib/hours";
import { candyTone } from "@/components/candy-glyphs";
import { effectiveVisit, isDecorated, offersSensitivity } from "@/lib/house-state";
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
    includeUndecorated,
  } = filters;
  const { houseSet, likedIds, visitedIds, now } = options;
  const {
    from: visitWindowFrom,
    to: visitWindowTo,
    mode: visitWindowMode,
  } = resolveVisitWindow(filters, now);
  return houses.filter((house) => {
    if (!houseMatchesSet(house, houseSet)) return false;
    if (accessibleOnly && !house.accessible) return false;
    if (candyFilters.length > 0 && !candyFilters.includes(candyTone(house))) return false;
    if (!includeUndecorated && !isDecorated(house)) return false;
    if (visitWindowMode === "now") {
      if (!isOpenNowForFilter(house, "", "", now)) return false;
    } else if (
      visitWindowMode === "custom" &&
      hasValidVisitWindow(visitWindowFrom, visitWindowTo)
    ) {
      if (!isOpenNowForFilter(house, visitWindowFrom, visitWindowTo, now)) return false;
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
