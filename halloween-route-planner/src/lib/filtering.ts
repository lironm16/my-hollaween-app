import type { House, RouteFilters } from "@/lib/types";
import { isHouseOpenNow } from "@/lib/utils";

function matchesScareLevel(house: House, filters: RouteFilters) {
  if (!filters.scareLevels.length) {
    return true;
  }
  return filters.scareLevels.includes(house.scareLevel);
}

function matchesAccessibility(house: House, filters: RouteFilters) {
  if (!filters.accessibility.length) {
    return true;
  }
  return filters.accessibility.every((tag) => house.accessibility.includes(tag));
}

function matchesDietary(house: House, filters: RouteFilters) {
  if (!filters.dietary.length) {
    return true;
  }
  return filters.dietary.every((tag) => house.dietary.includes(tag));
}

function matchesCandyLevel(house: House, filters: RouteFilters) {
  if (!filters.candyLevels.length) {
    return true;
  }
  return filters.candyLevels.includes(house.candyLevel);
}

export function filterHouses(
  houses: House[],
  filters: RouteFilters,
  reference = new Date(),
) {
  return houses.filter((house) => {
    if (filters.openNow && !isHouseOpenNow(house, reference)) {
      return false;
    }

    if (!matchesScareLevel(house, filters)) {
      return false;
    }

    if (!matchesAccessibility(house, filters)) {
      return false;
    }

    if (!matchesDietary(house, filters)) {
      return false;
    }

    if (!matchesCandyLevel(house, filters)) {
      return false;
    }

    return true;
  });
}
