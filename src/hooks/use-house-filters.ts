"use client";

import { useCallback, useEffect, useState } from "react";
import { NEIGHBORHOODS, type NeighborhoodId } from "@/lib/config";
import { loadHouseFilters, saveHouseFilters, type HouseFiltersState } from "@/lib/offline-db";
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
  sensitivityFilters: [],
  scareFilters: [...SCARE_LEVELS],
  candyFilters: [...CANDY_TONE_IDS],
  decorFilters: [...DECOR_LEVELS],
  neighborhoodFilters: [...NEIGHBORHOODS],
  likedOnly: false,
  unvisitedOnly: false,
};

type LegacyFilters = HouseFiltersState & {
  candyOnly?: boolean;
  includeUndecorated?: boolean;
  decoratedOnly?: boolean;
};

function pickKnown<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is T => (allowed as readonly string[]).includes(item));
}

function sanitize(raw: HouseFiltersState | null): HouseFiltersState {
  const empty = {
    ...DEFAULT_HOUSE_FILTERS,
    scareFilters: [...SCARE_LEVELS],
    candyFilters: [...CANDY_TONE_IDS],
    decorFilters: [...DECOR_LEVELS],
    neighborhoodFilters: [...NEIGHBORHOODS],
  };
  if (!raw) return empty;
  const legacy = raw as LegacyFilters;
  const neighborhoods = pickKnown(raw.neighborhoodFilters, NEIGHBORHOODS);
  const scares = pickKnown(raw.scareFilters, SCARE_LEVELS);
  const sensitivities = pickKnown(raw.sensitivityFilters, SENSITIVITY_OPTIONS);
  const candies = pickKnown(raw.candyFilters, CANDY_TONE_IDS);
  const decors = pickKnown(raw.decorFilters, DECOR_LEVELS);
  const candyFilters =
    candies.length > 0
      ? candies
      : legacy.candyOnly
        ? (["plenty", "low"] as CandyTone[])
        : [...CANDY_TONE_IDS];
  const includeUndecorated =
    legacy.includeUndecorated !== undefined
      ? Boolean(legacy.includeUndecorated)
      : legacy.decoratedOnly !== undefined
        ? !Boolean(legacy.decoratedOnly)
        : true;
  const decorFilters =
    decors.length > 0
      ? decors
      : includeUndecorated
        ? [...DECOR_LEVELS]
        : DECOR_LEVELS.filter((level): level is DecorLevel => level !== "none");
  return {
    accessibleOnly: Boolean(raw.accessibleOnly),
    openNowOnly: Boolean(raw.openNowOnly),
    likedOnly: Boolean(raw.likedOnly),
    unvisitedOnly: Boolean(raw.unvisitedOnly),
    neighborhoodFilters: Array.isArray(raw.neighborhoodFilters) ? neighborhoods : [...NEIGHBORHOODS],
    scareFilters: scares.length > 0 ? scares : [...SCARE_LEVELS],
    candyFilters,
    decorFilters,
    sensitivityFilters: sensitivities,
  };
}

function toggleItem<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

export function useHouseFilters() {
  const [filters, setFilters] = useState<HouseFiltersState>(DEFAULT_HOUSE_FILTERS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setFilters(sanitize(loadHouseFilters()));
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
    const next = {
      ...DEFAULT_HOUSE_FILTERS,
      scareFilters: [...SCARE_LEVELS],
      candyFilters: [...CANDY_TONE_IDS],
      decorFilters: [...DECOR_LEVELS],
      neighborhoodFilters: [...NEIGHBORHOODS],
      sensitivityFilters: [] as SensitivityId[],
    };
    saveHouseFilters(next);
    setFilters(next);
  }, []);

  function toggleNeighborhood(area: NeighborhoodId) {
    update((current) => ({
      ...current,
      neighborhoodFilters: toggleItem(current.neighborhoodFilters, area),
    }));
  }

  function toggleScare(level: ScareLevel) {
    update((current) => ({
      ...current,
      scareFilters: toggleItem(current.scareFilters, level),
    }));
  }

  function toggleCandy(tone: CandyTone) {
    update((current) => ({
      ...current,
      candyFilters: toggleItem(current.candyFilters, tone),
    }));
  }

  function toggleDecor(level: DecorLevel) {
    update((current) => ({
      ...current,
      decorFilters: toggleItem(current.decorFilters, level),
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
    toggleScare,
    toggleCandy,
    toggleDecor,
    toggleSensitivity,
  };
}
