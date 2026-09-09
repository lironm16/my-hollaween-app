import { houseInNeighborhoods } from "@/lib/config";
import {
  isClosingSoon,
  isHoursNightOver,
  isHoursNotYetOpen,
  isOnBreak,
  isOpenNow,
  isOpeningSoon,
} from "@/lib/hours";
import { candyTone } from "@/components/candy-glyphs";
import { effectiveVisit, isDecorated, isFrozen, offersSensitivity } from "@/lib/house-state";
import { houseMatchesSet, type HouseSet } from "@/lib/house-set";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";

export function isHouseClosedForDisplay(house: PublicHouse, now: Date) {
  return (
    effectiveVisit(house) === "closed" ||
    isHoursNightOver(house, now) ||
    isHoursNotYetOpen(house, now)
  );
}

export function isHouseOnBreakForDisplay(house: PublicHouse, now: Date) {
  if (isHouseClosedForDisplay(house, now)) return false;
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
    closedOnly,
    onBreakOnly,
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
  return houses.filter((house) => {
    if (!houseMatchesSet(house, houseSet)) return false;
    if (accessibleOnly && !house.accessible) return false;
    if (candyFilters.length > 0 && !candyFilters.includes(candyTone(house))) return false;
    if (!includeUndecorated && !isDecorated(house)) return false;
    if (openNowOnly || closingSoonOnly || openingSoonOnly) {
      const hoursHit =
        (openNowOnly && isOpenNow(house, now)) ||
        (closingSoonOnly && isClosingSoon(house, now)) ||
        (openingSoonOnly && isOpeningSoon(house, now));
      if (!hoursHit) return false;
    }
    if (closedOnly || onBreakOnly || decorOnlyOnly) {
      const statusHit =
        (closedOnly && isHouseClosedForDisplay(house, now)) ||
        (onBreakOnly && isHouseOnBreakForDisplay(house, now)) ||
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
