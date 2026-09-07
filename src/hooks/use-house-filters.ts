"use client";

import { useCallback, useEffect, useState } from "react";
import { NEIGHBORHOODS, type NeighborhoodId } from "@/lib/config";
import { loadHouseFilters, saveHouseFilters, type HouseFiltersState } from "@/lib/offline-db";
import { SCARE_LEVELS, SENSITIVITY_OPTIONS, type ScareLevel, type SensitivityId } from "@/lib/types";

export const DEFAULT_HOUSE_FILTERS: HouseFiltersState = {
  accessibleOnly: false,
  candyOnly: false,
  openNowOnly: false,
  sensitivityFilters: [],
  scareFilters: [...SCARE_LEVELS],
  neighborhoodFilters: [...NEIGHBORHOODS],
  likedOnly: false,
  unvisitedOnly: false,
  includeUndecorated: true,
};

const LEGACY_ALL_NEIGHBORHOODS = ["שיכון ותיקים", "חרוזים", "נחלת גנים"] as const;

function sanitize(raw: HouseFiltersState | null): HouseFiltersState {
  if (!raw) return { ...DEFAULT_HOUSE_FILTERS, scareFilters: [...SCARE_LEVELS], neighborhoodFilters: [...NEIGHBORHOODS] };
  let neighborhoods = (raw.neighborhoodFilters ?? []).filter((item): item is NeighborhoodId =>
    (NEIGHBORHOODS as readonly string[]).includes(item),
  );
  if (
    neighborhoods.length === LEGACY_ALL_NEIGHBORHOODS.length &&
    LEGACY_ALL_NEIGHBORHOODS.every((name) => neighborhoods.includes(name as NeighborhoodId))
  ) {
    neighborhoods = [...NEIGHBORHOODS];
  }
  const scares = (raw.scareFilters ?? []).filter((item): item is ScareLevel =>
    (SCARE_LEVELS as readonly string[]).includes(item),
  );
  const sensitivities = (raw.sensitivityFilters ?? []).filter((item): item is SensitivityId =>
    (SENSITIVITY_OPTIONS as readonly string[]).includes(item),
  );
  const legacy = raw as HouseFiltersState & { decoratedOnly?: boolean };
  const includeUndecorated =
    legacy.includeUndecorated !== undefined
      ? Boolean(legacy.includeUndecorated)
      : !Boolean(legacy.decoratedOnly);
  return {
    accessibleOnly: Boolean(raw.accessibleOnly),
    candyOnly: Boolean(raw.candyOnly),
    openNowOnly: Boolean(raw.openNowOnly),
    likedOnly: Boolean(raw.likedOnly),
    unvisitedOnly: Boolean(raw.unvisitedOnly),
    includeUndecorated,
    neighborhoodFilters: neighborhoods.length > 0 ? neighborhoods : [...NEIGHBORHOODS],
    scareFilters: scares.length > 0 ? scares : [...SCARE_LEVELS],
    sensitivityFilters: sensitivities,
  };
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
      neighborhoodFilters: [...NEIGHBORHOODS],
      sensitivityFilters: [] as SensitivityId[],
    };
    saveHouseFilters(next);
    setFilters(next);
  }, []);

  function toggleNeighborhood(area: NeighborhoodId) {
    update((current) => ({
      ...current,
      neighborhoodFilters: current.neighborhoodFilters.includes(area)
        ? current.neighborhoodFilters.filter((item) => item !== area)
        : [...current.neighborhoodFilters, area],
    }));
  }

  function toggleScare(level: ScareLevel) {
    update((current) => ({
      ...current,
      scareFilters: current.scareFilters.includes(level)
        ? current.scareFilters.filter((item) => item !== level)
        : [...current.scareFilters, level],
    }));
  }

  function toggleSensitivity(id: SensitivityId) {
    update((current) => ({
      ...current,
      sensitivityFilters: current.sensitivityFilters.includes(id)
        ? current.sensitivityFilters.filter((item) => item !== id)
        : [...current.sensitivityFilters, id],
    }));
  }

  return {
    ready,
    filters,
    update,
    clear,
    toggleNeighborhood,
    toggleScare,
    toggleSensitivity,
  };
}
