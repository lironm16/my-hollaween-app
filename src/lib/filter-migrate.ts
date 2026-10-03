import {
  NEIGHBORHOOD_FILTER_OPTIONS,
  NEIGHBORHOOD_FILTER_OTHER,
  NEIGHBORHOODS,
  type NeighborhoodFilterId,
  type NeighborhoodId,
} from "@/lib/config";
import {
  hasStockCandySelection,
  isKidsFriendlyFilter,
  isWithCandyFilter,
} from "@/lib/filter-presets";
import type { HouseFiltersState } from "@/lib/offline-db";
import { CANDY_TONE_IDS, SCARE_LEVELS } from "@/lib/types";

export const HOUSE_FILTERS_VERSION = 9;

const LEGACY_ALL_NEIGHBORHOODS = ["שיכון ותיקים", "חרוזים", "נחלת גנים"] as const;

function migrateNeighborhoodFilters(raw: readonly string[]): NeighborhoodFilterId[] {
  const mapped = raw.map((item) => (item === "שכונת הגפן" ? "הגפן" : item));
  const known = mapped.filter((item): item is NeighborhoodFilterId =>
    (NEIGHBORHOOD_FILTER_OPTIONS as readonly string[]).includes(item),
  );
  const hoodsOnly = known.filter((item): item is NeighborhoodId =>
    (NEIGHBORHOODS as readonly string[]).includes(item),
  );
  const hadAllLegacy =
    hoodsOnly.length >= LEGACY_ALL_NEIGHBORHOODS.length &&
    LEGACY_ALL_NEIGHBORHOODS.every((name) => hoodsOnly.includes(name));
  if (hadAllLegacy && !hoodsOnly.includes("הגפן")) {
    return [...NEIGHBORHOOD_FILTER_OPTIONS];
  }
  if (
    hoodsOnly.length === NEIGHBORHOODS.length &&
    NEIGHBORHOODS.every((name) => hoodsOnly.includes(name)) &&
    !known.includes(NEIGHBORHOOD_FILTER_OTHER)
  ) {
    return [...NEIGHBORHOOD_FILTER_OPTIONS];
  }
  return known;
}

/** Drop engine flags that no longer have UI controls. */
export function migrateHouseFilters(filters: HouseFiltersState): HouseFiltersState {
  const next: HouseFiltersState = {
    ...filters,
    locationKindFilter: filters.locationKindFilter ?? "all",
    openNowOnly: false,
    closingSoonOnly: false,
    openingSoonOnly: false,
    notYetOpenOnly: false,
    onBreakOnly: false,
    afterHoursOnly: false,
    closedOnly: false,
    decorOnlyOnly: false,
    visitedOnly: false,
    skippedOnly: false,
    uncollectedGemOnly: Boolean(filters.uncollectedGemOnly),
    scareFilters: [...filters.scareFilters],
    candyFilters: [...filters.candyFilters],
    neighborhoodFilters: migrateNeighborhoodFilters(filters.neighborhoodFilters),
    sensitivityFilters: [...filters.sensitivityFilters],
  };

  const withCandy = isWithCandyFilter(next);
  const allCandy =
    next.candyFilters.length === CANDY_TONE_IDS.length &&
    CANDY_TONE_IDS.every((tone) => next.candyFilters.includes(tone));
  if (!withCandy && !allCandy && next.candyFilters.length > 0) {
    next.candyFilters = [...CANDY_TONE_IDS];
    next.sensitivityFilters = [];
  }

  const kids = isKidsFriendlyFilter(next);
  const allScare =
    next.scareFilters.length === SCARE_LEVELS.length &&
    SCARE_LEVELS.every((level) => next.scareFilters.includes(level)) &&
    next.includeUndecorated;
  if (!kids && !allScare && (next.scareFilters.length > 0 || next.includeUndecorated)) {
    next.scareFilters = [...SCARE_LEVELS];
    next.includeUndecorated = true;
  }

  if (!hasStockCandySelection(next)) {
    next.sensitivityFilters = [];
  }

  return next;
}
