import { houseInNeighborhoods } from "@/lib/config";
import { isClosingSoon, isOpenNow, isOpeningSoon } from "@/lib/hours";
import { candyTone } from "@/components/candy-glyphs";
import { isDecorated, offersSensitivity } from "@/lib/house-state";
import { houseMatchesSet, type HouseSet } from "@/lib/house-set";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";

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
    sensitivityFilters,
    scareFilters,
    candyFilters,
    neighborhoodFilters,
    likedOnly,
    unvisitedOnly,
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
    for (const sensitivity of sensitivityFilters) {
      if (!offersSensitivity(house, sensitivity)) return false;
    }
    if (isDecorated(house) && scareFilters.length > 0 && !scareFilters.includes(house.scareLevel)) {
      return false;
    }
    if (!houseInNeighborhoods(house, neighborhoodFilters)) return false;
    if (likedOnly && !likedIds.includes(house.id)) return false;
    if (unvisitedOnly && visitedIds.includes(house.id)) return false;
    return true;
  });
}

export function routeHouseIds(route: { stops: { houses: { id: string }[] }[] } | null) {
  if (!route) return new Set<string>();
  return new Set(route.stops.flatMap((stop) => stop.houses.map((house) => house.id)));
}
