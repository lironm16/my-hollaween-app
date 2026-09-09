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
import { filterHouses, routeHouseIds } from "@/lib/filter-houses";
import { visitWindowIssue } from "@/lib/hours";
import type { HouseFiltersState } from "@/lib/offline-db";
import { shouldSkipRoutePrompt } from "@/lib/route-prompts";
import { buildWalkingRoute, type WalkingRoute } from "@/lib/route";
import type { ResolvedOrigin } from "@/lib/distance-origin";
import type { HouseSet } from "@/lib/house-set";
import type { PublicHouse } from "@/lib/types";

type RoutePrompt = {
  kind: "enter-route" | "filter-change";
  title: string;
  description: string;
  confirmLabel: string;
  removedHouses?: string[];
  addedHouses?: string[];
  onConfirm: (includeNewHouses: boolean) => void;
};

export function useFilterDraft({
  filters,
  updateFilters,
  houses,
  filterContext,
  routeMode,
  pinnedRoute,
  setPinnedRoute,
  origin,
  visitedIds,
  now,
  setRoutePrompt,
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
  visitedIds: string[];
  now: Date;
  setRoutePrompt: (prompt: RoutePrompt | null) => void;
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
  const visitWindowInvalid = houseFiltersDraftInvalid(sheetFilters);

  function routeHousesForFilters(nextFilters: HouseFiltersState) {
    const nextVisible = filterHouses(houses, nextFilters, filterContext);
    const keepIds = routeHouseIds(pinnedRoute);
    const routeHouses: PublicHouse[] = [];
    const seen = new Set<string>();
    for (const house of nextVisible) {
      if (keepIds.has(house.id) || !visitedIds.includes(house.id)) {
        routeHouses.push(house);
        seen.add(house.id);
      }
    }
    if (pinnedRoute) {
      for (const stop of pinnedRoute.stops) {
        for (const house of stop.houses) {
          if (seen.has(house.id)) continue;
          const fresh = nextVisible.find((item) => item.id === house.id);
          if (fresh) {
            routeHouses.push(fresh);
            seen.add(house.id);
          }
        }
      }
    }
    return routeHouses;
  }

  function trimRouteToFilter(nextFilters: HouseFiltersState) {
    const nextVisible = filterHouses(houses, nextFilters, filterContext);
    const visibleIds = new Set(nextVisible.map((house) => house.id));
    const routeHouses: PublicHouse[] = [];
    for (const stop of pinnedRoute?.stops ?? []) {
      for (const house of stop.houses) {
        const fresh = nextVisible.find((item) => item.id === house.id);
        if (fresh && visibleIds.has(house.id)) routeHouses.push(fresh);
      }
    }
    return routeHouses;
  }

  function previewRouteDiff(nextFilters: HouseFiltersState) {
    const currentIds = routeHouseIds(pinnedRoute);
    const nextVisible = filterHouses(houses, nextFilters, filterContext);
    const removedHouses = [...currentIds]
      .filter((id) => !nextVisible.some((house) => house.id === id))
      .map((id) => houses.find((house) => house.id === id)?.name ?? id);
    const addedHouses = nextVisible
      .filter((house) => !currentIds.has(house.id) && !visitedIds.includes(house.id))
      .map((house) => house.name);
    return { removedHouses, addedHouses };
  }

  function applyFiltersWithRoute(nextFilters: HouseFiltersState, includeNew: boolean) {
    updateFilters(() => cloneHouseFilters(nextFilters));
    if (routeMode) {
      const routeHouses = includeNew
        ? routeHousesForFilters(nextFilters)
        : trimRouteToFilter(nextFilters);
      setPinnedRoute(
        buildWalkingRoute(routeHouses, origin, {
          accessible: nextFilters.accessibleOnly,
          startedFrom: origin.kind,
          originLabel: origin.label,
        }),
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
    if (houseFiltersDraftInvalid(nextFilters)) {
      toast.error(visitWindowIssue(nextFilters.visitWindowFrom, nextFilters.visitWindowTo)!);
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
    const { removedHouses, addedHouses } = previewRouteDiff(nextFilters);
    const hasRouteChange = removedHouses.length > 0 || addedHouses.length > 0;
    if (!hasRouteChange) {
      applyFiltersWithRoute(nextFilters, false);
      return;
    }
    if (shouldSkipRoutePrompt("filter-change")) {
      applyFiltersWithRoute(nextFilters, addedHouses.length > 0);
      return;
    }
    setRoutePrompt({
      kind: "filter-change",
      title: "לעדכן את הסינון?",
      description:
        "המסלול יתאים לרשימה החדשה. «ביטול» משאיר את הסינון והמסלול כמו שהם.",
      confirmLabel: "עדכון הסינון",
      removedHouses,
      addedHouses,
      onConfirm: (includeNew) => applyFiltersWithRoute(nextFilters, includeNew),
    });
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
