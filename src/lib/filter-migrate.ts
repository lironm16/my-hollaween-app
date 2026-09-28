import { NEIGHBORHOODS, type NeighborhoodId } from "@/lib/config";
import {
  hasStockCandySelection,
  isKidsFriendlyFilter,
  isWithCandyFilter,
} from "@/lib/filter-presets";
import type { HouseFiltersState } from "@/lib/offline-db";
import { CANDY_TONE_IDS, SCARE_LEVELS } from "@/lib/types";

export const HOUSE_FILTERS_VERSION = 8;

const LEGACY_ALL_NEIGHBORHOODS = ["שיכון ותיקים", "חרוזים", "נחלת גנים"] as const;

function migrateNeighborhoodFilters(raw: readonly string[]): NeighborhoodId[] {
  const mapped = raw.map((item) => (item === "שכונת הגפן" ? "הגפן" : item));
  const known = mapped.filter((item): item is NeighborhoodId =>
    (NEIGHBORHOODS as readonly string[]).includes(item),
  );
  const hadAllLegacy =
    known.length >= LEGACY_ALL_NEIGHBORHOODS.length &&
    LEGACY_ALL_NEIGHBORHOODS.every((name) => known.includes(name));
  if (hadAllLegacy && !known.includes("הגפן")) {
    return [...NEIGHBORHOODS];
  }
  return known.length > 0 ? known : [...NEIGHBORHOODS];
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
