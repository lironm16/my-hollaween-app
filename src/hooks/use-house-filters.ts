"use client";

import { useCallback, useEffect, useState } from "react";
import { NEIGHBORHOODS, type NeighborhoodId } from "@/lib/config";
import { HOUSE_FILTERS_VERSION, migrateHouseFilters } from "@/lib/filter-migrate";
import { hasVisitWindow, parseClockMinutes } from "@/lib/hours";
import { effectiveVisitWindowMode } from "@/lib/visit-window";
import {
  loadHouseFilters,
  loadHouseFiltersVersion,
  saveHouseFilters,
  saveHouseFiltersVersion,
  type HouseFiltersState,
} from "@/lib/offline-db";
import {
  CANDY_TONE_IDS,
  DECOR_LEVELS,
  SCARE_LEVELS,
  SENSITIVITY_OPTIONS,
  type CandyTone,
  type DecorLevel,
  type ScareLevel,
  type SensitivityId,
} from "@/lib/types";

export const DEFAULT_HOUSE_FILTERS: HouseFiltersState = {
  accessibleOnly: false,
  openNowOnly: false,
  closingSoonOnly: false,
  openingSoonOnly: false,
  notYetOpenOnly: false,
  onBreakOnly: false,
  afterHoursOnly: false,
  visitWindowMode: "all",
  visitWindowFrom: "",
  visitWindowTo: "",
  closedOnly: false,
  decorOnlyOnly: false,
  sensitivityFilters: [],
  scareFilters: [...SCARE_LEVELS],
  candyFilters: [...CANDY_TONE_IDS],
  neighborhoodFilters: [...NEIGHBORHOODS],
  likedOnly: false,
  unvisitedOnly: false,
  visitedOnly: false,
  includeUndecorated: true,
};

type LegacyFilters = HouseFiltersState & {
  candyOnly?: boolean;
  decoratedOnly?: boolean;
  decorFilters?: DecorLevel[];
};

function sanitizeClock(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, 5);
  return parseClockMinutes(trimmed) !== null ? trimmed : "";
}

function pickKnown<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is T => (allowed as readonly string[]).includes(item));
}

function sanitize(raw: HouseFiltersState | null): HouseFiltersState {
  const empty = {
    ...DEFAULT_HOUSE_FILTERS,
    scareFilters: [...SCARE_LEVELS],
    candyFilters: [...CANDY_TONE_IDS],
    neighborhoodFilters: [...NEIGHBORHOODS],
  };
  if (!raw) return empty;
  const legacy = raw as LegacyFilters;
  const neighborhoods = pickKnown(raw.neighborhoodFilters, NEIGHBORHOODS);
  const scares = pickKnown(raw.scareFilters, SCARE_LEVELS);
  const sensitivities = pickKnown(raw.sensitivityFilters, SENSITIVITY_OPTIONS);
  const candies = pickKnown(raw.candyFilters, CANDY_TONE_IDS);
  const candyFilters =
    candies.length > 0
      ? candies
      : legacy.candyOnly
        ? (["plenty", "low"] as CandyTone[])
        : [...CANDY_TONE_IDS];
  const decors = pickKnown(legacy.decorFilters, DECOR_LEVELS);
  const includeUndecorated =
    raw.includeUndecorated !== undefined
      ? Boolean(raw.includeUndecorated)
      : legacy.decoratedOnly !== undefined
        ? !Boolean(legacy.decoratedOnly)
        : decors.length > 0
          ? decors.includes("none")
          : true;
  return {
    accessibleOnly: Boolean(raw.accessibleOnly),
    openNowOnly: Boolean(raw.openNowOnly),
    closingSoonOnly: Boolean(raw.closingSoonOnly),
    openingSoonOnly: Boolean(raw.openingSoonOnly),
    notYetOpenOnly: Boolean(raw.notYetOpenOnly),
    onBreakOnly: Boolean(raw.onBreakOnly),
    afterHoursOnly: Boolean(raw.afterHoursOnly),
    visitWindowMode:
      raw.visitWindowMode === "custom" ||
      raw.visitWindowMode === "now" ||
      raw.visitWindowMode === "all"
        ? raw.visitWindowMode
        : hasVisitWindow(raw.visitWindowFrom, raw.visitWindowTo)
          ? "custom"
          : "all",
    visitWindowUseFrom: raw.visitWindowUseFrom ?? true,
    visitWindowUseTo: raw.visitWindowUseTo ?? false,
    visitWindowFrom: sanitizeClock(raw.visitWindowFrom),
    visitWindowTo: sanitizeClock(raw.visitWindowTo),
    closedOnly: Boolean(raw.closedOnly),
    decorOnlyOnly: Boolean(raw.decorOnlyOnly),
    likedOnly: Boolean(raw.likedOnly),
    unvisitedOnly: Boolean(raw.unvisitedOnly),
    visitedOnly: Boolean(raw.visitedOnly),
    includeUndecorated,
    neighborhoodFilters: Array.isArray(raw.neighborhoodFilters) ? neighborhoods : [...NEIGHBORHOODS],
    scareFilters: scares.length > 0 ? scares : [...SCARE_LEVELS],
    candyFilters,
    sensitivityFilters: sensitivities,
  };
}

export function loadSanitizedHouseFilters(): HouseFiltersState {
  const storedVersion = loadHouseFiltersVersion();
  let next = sanitize(loadHouseFilters());
  if (storedVersion < HOUSE_FILTERS_VERSION) {
    next = migrateHouseFilters(next);
    saveHouseFilters(next);
    saveHouseFiltersVersion(HOUSE_FILTERS_VERSION);
  }
  return next;
}

export function cloneHouseFilters(state: HouseFiltersState): HouseFiltersState {
  return {
    ...state,
    scareFilters: [...state.scareFilters],
    candyFilters: [...state.candyFilters],
    neighborhoodFilters: [...state.neighborhoodFilters],
    sensitivityFilters: [...state.sensitivityFilters],
  };
}

export function emptyHouseFilters(): HouseFiltersState {
  return {
    ...DEFAULT_HOUSE_FILTERS,
    visitWindowMode: "all",
    visitWindowFrom: "",
    visitWindowTo: "",
    openNowOnly: false,
    closingSoonOnly: false,
    openingSoonOnly: false,
    notYetOpenOnly: false,
    onBreakOnly: false,
    afterHoursOnly: false,
    closedOnly: false,
    decorOnlyOnly: false,
    likedOnly: false,
    unvisitedOnly: false,
    visitedOnly: false,
    accessibleOnly: false,
    scareFilters: [...SCARE_LEVELS],
    candyFilters: [...CANDY_TONE_IDS],
    neighborhoodFilters: [...NEIGHBORHOODS],
    sensitivityFilters: [],
    includeUndecorated: true,
  };
}

export function countActiveFilters(filters: HouseFiltersState): number {
  const neighborhoodActiveCount =
    filters.neighborhoodFilters.length === NEIGHBORHOODS.length
      ? 0
      : NEIGHBORHOODS.length - filters.neighborhoodFilters.length;
  const candyDefault =
    filters.candyFilters.length === CANDY_TONE_IDS.length &&
    CANDY_TONE_IDS.every((tone) => filters.candyFilters.includes(tone));
  const scareDefault =
    filters.includeUndecorated &&
    filters.scareFilters.length === SCARE_LEVELS.length &&
    SCARE_LEVELS.every((level) => filters.scareFilters.includes(level));

  return (
    neighborhoodActiveCount +
    Number(effectiveVisitWindowMode(filters) !== "all") +
    Number(!candyDefault) +
    Number(!scareDefault) +
    Number(filters.accessibleOnly) +
    Number(filters.likedOnly) +
    filters.sensitivityFilters.length
  );
}

export function filtersEqual(a: HouseFiltersState, b: HouseFiltersState) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function toggleItem<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

export function useHouseFilters() {
  const [filters, setFilters] = useState<HouseFiltersState>(DEFAULT_HOUSE_FILTERS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setFilters(loadSanitizedHouseFilters());
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<HouseFiltersState> | ((current: HouseFiltersState) => HouseFiltersState)) => {
    setFilters((current) => {
      const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
      saveHouseFilters(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    const next = emptyHouseFilters();
    saveHouseFilters(next);
    saveHouseFiltersVersion(HOUSE_FILTERS_VERSION);
    setFilters(next);
  }, []);

  function toggleNeighborhood(area: NeighborhoodId) {
    update((current) => ({
      ...current,
      neighborhoodFilters: toggleItem(current.neighborhoodFilters, area),
    }));
  }

  function toggleSensitivity(id: SensitivityId) {
    update((current) => ({
      ...current,
      sensitivityFilters: toggleItem(current.sensitivityFilters, id),
    }));
  }

  return {
    ready,
    filters,
    update,
    clear,
    toggleNeighborhood,
    toggleSensitivity,
  };
}
