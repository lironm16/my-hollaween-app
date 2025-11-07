"use client";

import { create } from "zustand";
import type { CandyLevel, RouteFilters, ScareLevel } from "@/lib/types";

export type ViewMode = "map" | "list";

const defaultFilters: RouteFilters = {
  radiusKm: 2,
  scareLevels: [],
  accessibility: [],
  dietary: [],
  candyLevels: ["green", "yellow"],
  openNow: false,
  onlyFavorites: false,
};

type MapUIStore = {
  viewMode: ViewMode;
  filters: RouteFilters;
  setViewMode: (view: ViewMode) => void;
  toggleScareLevel: (level: ScareLevel) => void;
  toggleCandyLevel: (level: CandyLevel) => void;
  toggleAccessibility: (tag: string) => void;
  toggleDietary: (tag: string) => void;
  setRadius: (radius?: number) => void;
  toggleOpenNow: () => void;
  toggleFavorites: () => void;
  resetFilters: () => void;
};

export const useMapUIStore = create<MapUIStore>((set) => ({
  viewMode: "list",
  filters: defaultFilters,
  setViewMode: (view) => set({ viewMode: view }),
  toggleScareLevel: (level) =>
    set((state) => {
      const exists = state.filters.scareLevels.includes(level);
      return {
        filters: {
          ...state.filters,
          scareLevels: exists
            ? state.filters.scareLevels.filter((item) => item !== level)
            : [...state.filters.scareLevels, level],
        },
      };
    }),
  toggleCandyLevel: (level) =>
    set((state) => {
      const exists = state.filters.candyLevels.includes(level);
      return {
        filters: {
          ...state.filters,
          candyLevels: exists
            ? state.filters.candyLevels.filter((item) => item !== level)
            : [...state.filters.candyLevels, level],
        },
      };
    }),
  toggleAccessibility: (tag) =>
    set((state) => {
      const exists = state.filters.accessibility.includes(tag);
      return {
        filters: {
          ...state.filters,
          accessibility: exists
            ? state.filters.accessibility.filter((item) => item !== tag)
            : [...state.filters.accessibility, tag],
        },
      };
    }),
  toggleDietary: (tag) =>
    set((state) => {
      const exists = state.filters.dietary.includes(tag);
      return {
        filters: {
          ...state.filters,
          dietary: exists
            ? state.filters.dietary.filter((item) => item !== tag)
            : [...state.filters.dietary, tag],
        },
      };
    }),
  setRadius: (radius) =>
    set((state) => ({
      filters: {
        ...state.filters,
        radiusKm: radius,
      },
    })),
  toggleOpenNow: () =>
    set((state) => ({
      filters: {
        ...state.filters,
        openNow: !state.filters.openNow,
      },
    })),
  toggleFavorites: () =>
    set((state) => ({
      filters: {
        ...state.filters,
        onlyFavorites: !state.filters.onlyFavorites,
      },
    })),
  resetFilters: () => set({ filters: defaultFilters }),
}));
