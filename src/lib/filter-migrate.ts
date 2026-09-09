import { isKidsFriendlyFilter, isWithCandyFilter } from "@/lib/filter-presets";
import type { HouseFiltersState } from "@/lib/offline-db";
import { CANDY_TONE_IDS, SCARE_LEVELS } from "@/lib/types";

export const HOUSE_FILTERS_VERSION = 2;

/** Drop engine flags that no longer have UI controls. */
export function migrateHouseFilters(filters: HouseFiltersState): HouseFiltersState {
  const next: HouseFiltersState = {
    ...filters,
    openNowOnly: false,
    closingSoonOnly: false,
    openingSoonOnly: false,
    notYetOpenOnly: false,
    onBreakOnly: false,
    afterHoursOnly: false,
    closedOnly: false,
    decorOnlyOnly: false,
    visitedOnly: false,
    scareFilters: [...filters.scareFilters],
    candyFilters: [...filters.candyFilters],
    neighborhoodFilters: [...filters.neighborhoodFilters],
    sensitivityFilters: [...filters.sensitivityFilters],
  };

  const withCandy = isWithCandyFilter(next);
  const allCandy =
    next.candyFilters.length === CANDY_TONE_IDS.length &&
    CANDY_TONE_IDS.every((tone) => next.candyFilters.includes(tone));
  if (!withCandy && !allCandy) {
    next.candyFilters = [...CANDY_TONE_IDS];
    next.sensitivityFilters = [];
  }

  const kids = isKidsFriendlyFilter(next);
  const allScare =
    next.scareFilters.length === SCARE_LEVELS.length &&
    SCARE_LEVELS.every((level) => next.scareFilters.includes(level)) &&
    next.includeUndecorated;
  if (!kids && !allScare) {
    next.scareFilters = [...SCARE_LEVELS];
    next.includeUndecorated = true;
  }

  if (!withCandy) {
    next.sensitivityFilters = [];
  }

  return next;
}
