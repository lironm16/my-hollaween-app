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
import { diffRouteByFilters } from "@/lib/route-changes";
import { shouldSkipRoutePrompt } from "@/lib/route-prompts";
import { buildWalkingRouteOrdered, type WalkingRoute } from "@/lib/route";
import type { ResolvedOrigin } from "@/lib/distance-origin";
import type { HouseSet } from "@/lib/house-set";
import type { PublicHouse } from "@/lib/types";

type RoutePrompt = {
  kind: "enter-route" | "filter-change" | "status-change";
  title: string;
  description: string;
  confirmLabel: string;
  removedHouses?: { name: string; reason: string }[];
  addedHouses?: { name: string; reason: string }[];
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
  skippedIds,
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
  skippedIds: string[];
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
  const visitWindowInvalid = houseFiltersDraftInvalid(sheetFilters, now);

  function routeHousesForFilters(nextFilters: HouseFiltersState) {
    const nextVisible = filterHouses(houses, nextFilters, filterContext);
    const visibleIds = new Set(nextVisible.map((house) => house.id));
    const skipped = new Set(skippedIds);
    const routeHouses: PublicHouse[] = [];
    const seen = new Set<string>();
    for (const stop of pinnedRoute?.stops ?? []) {
      for (const house of stop.houses) {
        const fresh = nextVisible.find((item) => item.id === house.id);
        if (!fresh || !visibleIds.has(house.id) || seen.has(house.id)) continue;
        if (skipped.has(house.id)) continue;
        if (nextFilters.unvisitedOnly && visitedIds.includes(house.id)) continue;
        routeHouses.push(fresh);
        seen.add(house.id);
      }
    }
    for (const house of nextVisible) {
      if (seen.has(house.id)) continue;
      if (skipped.has(house.id)) continue;
      if (nextFilters.unvisitedOnly && visitedIds.includes(house.id)) continue;
      routeHouses.push(house);
      seen.add(house.id);
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
    return diffRouteByFilters(pinnedRoute, houses, nextFilters, {
      ...filterContext,
      skippedIds,
    });
  }

  function applyFiltersWithRoute(nextFilters: HouseFiltersState, includeNew: boolean) {
    updateFilters(() => cloneHouseFilters(nextFilters));
    if (routeMode) {
      const routeHouses = includeNew
        ? routeHousesForFilters(nextFilters)
        : trimRouteToFilter(nextFilters);
      setPinnedRoute(
        buildWalkingRouteOrdered(routeHouses, { lat: origin.lat, lng: origin.lng }, {
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
    const { removed: removedHouses, added: addedHouses } = previewRouteDiff(nextFilters);
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
