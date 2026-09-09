import type { HouseFiltersState } from "@/lib/offline-db";
import { CANDY_TONE_IDS, SCARE_LEVELS, type CandyTone } from "@/lib/types";

/** Houses that still offer candy (in stock or running low). */
export const WITH_CANDY_TONES: CandyTone[] = ["plenty", "low"];

export function isWithCandyFilter(filters: HouseFiltersState): boolean {
  if (filters.candyFilters.length !== WITH_CANDY_TONES.length) return false;
  return WITH_CANDY_TONES.every((tone) => filters.candyFilters.includes(tone));
}

/** Green or yellow candy stock selected — required before sensitivity filters apply. */
export function hasStockCandySelection(filters: HouseFiltersState): boolean {
  return WITH_CANDY_TONES.some((tone) => filters.candyFilters.includes(tone));
}

export function withCandyPatch(on: boolean): Partial<HouseFiltersState> {
  if (on) {
    return {
      candyFilters: [...WITH_CANDY_TONES],
    };
  }
  return {
    candyFilters: [...CANDY_TONE_IDS],
    sensitivityFilters: [],
  };
}

export function isKidsFriendlyFilter(filters: HouseFiltersState): boolean {
  return (
    filters.scareFilters.length === 1 &&
    filters.scareFilters[0] === "mild" &&
    filters.includeUndecorated
  );
}

export function kidsFriendlyPatch(on: boolean): Partial<HouseFiltersState> {
  if (on) {
    return {
      scareFilters: ["mild"],
      includeUndecorated: true,
    };
  }
  return {
    scareFilters: [...SCARE_LEVELS],
    includeUndecorated: true,
  };
}
