"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { houseFiltersDraftInvalid } from "@/components/house-filters-content";
import {
  cloneHouseFilters,
  countActiveFilters,
  emptyHouseFilters,
  filtersEqual,
} from "@/hooks/use-house-filters";
import { filterHouses } from "@/lib/filter-houses";
import { visitWindowIssue } from "@/lib/hours";
import { resolveVisitWindow } from "@/lib/visit-window";
import type { HouseFiltersState } from "@/lib/offline-db";
import { diffRouteByFilters, rebuildRouteAfterFilterChange } from "@/lib/route-changes";
import type { WalkingRoute } from "@/lib/route";
import type { ResolvedOrigin } from "@/lib/distance-origin";
import type { HouseSet } from "@/lib/house-set";
import type { PublicHouse } from "@/lib/types";

export function useFilterDraft({
  filters,
  updateFilters,
  houses,
  filterContext,
  routeMode,
  pinnedRoute,
  setPinnedRoute,
  origin,
  skippedIds,
  now,
}: {
  filters: HouseFiltersState;
  updateFilters: (
    patch: Partial<HouseFiltersState> | ((current: HouseFiltersState) => HouseFiltersState),
  ) => void;
  houses: PublicHouse[];
  filterContext: {
    houseSet: HouseSet;
    likedIds: string[];
    visitedIds: string[];
    now: Date;
  };
  routeMode: boolean;
  pinnedRoute: WalkingRoute | null;
  setPinnedRoute: (route: WalkingRoute | null) => void;
  origin: ResolvedOrigin;
  skippedIds: string[];
  now: Date;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<HouseFiltersState | null>(null);
  const filtersOpenRef = useRef(false);

  useEffect(() => {
    if (filtersOpen && !filtersOpenRef.current) {
      setFilterDraft(cloneHouseFilters(filters));
    }
    if (!filtersOpen) setFilterDraft(null);
    filtersOpenRef.current = filtersOpen;
  }, [filtersOpen, filters]);

  const sheetFilters = filterDraft ?? filters;
  const sheetActiveCount = useMemo(() => countActiveFilters(sheetFilters), [sheetFilters]);
  const sheetResultCount = useMemo(
    () => filterHouses(houses, sheetFilters, filterContext).length,
    [houses, sheetFilters, filterContext],
  );
  const visitWindowInvalid = houseFiltersDraftInvalid(sheetFilters, now);

  function previewRouteDiff(nextFilters: HouseFiltersState) {
    return diffRouteByFilters(pinnedRoute, houses, nextFilters, {
      ...filterContext,
      skippedIds,
    });
  }

  function applyFiltersWithRoute(nextFilters: HouseFiltersState, includeNew: boolean) {
    updateFilters(() => cloneHouseFilters(nextFilters));
    if (routeMode) {
      setPinnedRoute(
        rebuildRouteAfterFilterChange(
          pinnedRoute,
          houses,
          nextFilters,
          { ...filterContext, skippedIds },
          includeNew,
          { lat: origin.lat, lng: origin.lng },
          {
            accessible: nextFilters.accessibleOnly,
            startedFrom: origin.kind,
            originLabel: origin.label,
          },
        ),
      );
    }
    setFiltersOpen(false);
  }

  function patchFilterDraft(
    patch: Partial<HouseFiltersState> | ((current: HouseFiltersState) => HouseFiltersState),
  ) {
    setFilterDraft((current) => {
      const base = current ?? cloneHouseFilters(filters);
      const next = typeof patch === "function" ? patch(base) : { ...base, ...patch };
      return cloneHouseFilters(next);
    });
  }

  function resetFilterDraft() {
    setFilterDraft(emptyHouseFilters());
  }

  function commitFilterDraft() {
    const nextFilters = filterDraft ?? filters;
    if (houseFiltersDraftInvalid(nextFilters, now)) {
      const { from, to } = resolveVisitWindow(nextFilters, now);
      toast.error(visitWindowIssue(from, to)!);
      return;
    }
    if (filtersEqual(nextFilters, filters)) {
      setFiltersOpen(false);
      return;
    }
    if (!routeMode) {
      applyFiltersWithRoute(nextFilters, false);
      return;
    }
    const { added: addedHouses } = previewRouteDiff(nextFilters);
    applyFiltersWithRoute(nextFilters, addedHouses.length > 0);
  }

  return {
    filtersOpen,
    setFiltersOpen,
    sheetFilters,
    sheetActiveCount,
    sheetResultCount,
    visitWindowInvalid,
    patchFilterDraft,
    resetFilterDraft,
    commitFilterDraft,
  };
}
