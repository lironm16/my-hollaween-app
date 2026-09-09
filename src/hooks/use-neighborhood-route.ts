"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shouldSkipRoutePrompt } from "@/lib/route-prompts";
import { buildWalkingRoute, type WalkingRoute } from "@/lib/route";
import type { HouseFiltersState } from "@/lib/offline-db";
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

export function useNeighborhoodRoute({
  visible,
  houses,
  filters,
  filterContext,
  visitedIds,
  origin,
  accessibleOnly,
  gps,
  geoRefresh,
  setAskedLocation,
  setRoutePrompt,
  onBeforeEnter,
}: {
  visible: PublicHouse[];
  houses: PublicHouse[];
  filters: HouseFiltersState;
  filterContext: {
    houseSet: HouseSet;
    likedIds: string[];
    visitedIds: string[];
    now: Date;
  };
  visitedIds: string[];
  origin: ResolvedOrigin;
  accessibleOnly: boolean;
  gps: { lat: number; lng: number } | null;
  geoRefresh: () => void;
  setAskedLocation: (value: boolean) => void;
  setRoutePrompt: (prompt: RoutePrompt | null) => void;
  onBeforeEnter: () => void;
}) {
  const [routeMode, setRouteMode] = useState(false);
  const [pinnedRoute, setPinnedRoute] = useState<WalkingRoute | null>(null);
  const [routeFitTick, setRouteFitTick] = useState(0);
  const pendingRouteGps = useRef(false);

  const filterRoute = useMemo(() => {
    const routeHouses = visible.filter((house) => !visitedIds.includes(house.id));
    return buildWalkingRoute(routeHouses, origin, {
      accessible: accessibleOnly,
      startedFrom: origin.kind,
      originLabel: origin.label,
    });
  }, [visible, visitedIds, accessibleOnly, origin]);

  const pinCurrentRoute = useCallback(
    (fit = false) => {
      setPinnedRoute(filterRoute);
      if (fit) setRouteFitTick((n) => n + 1);
    },
    [filterRoute],
  );

  useEffect(() => {
    if (!routeMode || !pendingRouteGps.current || !gps) return;
    pendingRouteGps.current = false;
    pinCurrentRoute(true);
  }, [routeMode, gps, pinCurrentRoute]);

  useEffect(() => {
    if (!routeMode || pendingRouteGps.current) return;
    setPinnedRoute((current) => {
      if (!current) return current;
      const visibleIds = new Set(visible.map((house) => house.id));
      const routeHouses: PublicHouse[] = [];
      for (const stop of current.stops) {
        for (const house of stop.houses) {
          const fresh = visible.find((item) => item.id === house.id);
          if (fresh && visibleIds.has(house.id)) routeHouses.push(fresh);
        }
      }
      return buildWalkingRoute(routeHouses, origin, {
        accessible: accessibleOnly,
        startedFrom: origin.kind,
        originLabel: origin.label,
      });
    });
  }, [routeMode, visible, origin, accessibleOnly]);

  function exitRouteMode() {
    pendingRouteGps.current = false;
    setRouteMode(false);
    setPinnedRoute(null);
  }

  function enterRouteMode() {
    if (routeMode) return;
    const proceed = () => {
      onBeforeEnter();
      setRouteMode(true);
      if (origin.kind === "gps" && !gps) {
        pendingRouteGps.current = true;
        setAskedLocation(true);
        geoRefresh();
        return;
      }
      pendingRouteGps.current = false;
      pinCurrentRoute(true);
    };
    if (shouldSkipRoutePrompt("enter-route")) {
      proceed();
      return;
    }
    const visitedExcluded = visible.filter((house) => visitedIds.includes(house.id));
    if (visitedExcluded.length === 0) {
      proceed();
      return;
    }
    setRoutePrompt({
      kind: "enter-route",
      title: "להתחיל מסלול?",
      description:
        "בתים שכבר סימנתם כביקור לא ייכללו במסלול. «ביטול» לא יפתח מסלול.",
      confirmLabel: "התחלת מסלול",
      removedHouses: visitedExcluded.map((house) => house.name),
      onConfirm: () => proceed(),
    });
  }

  return {
    routeMode,
    pinnedRoute,
    setPinnedRoute,
    routeFitTick,
    filterRoute,
    pinCurrentRoute,
    enterRouteMode,
    exitRouteMode,
    pendingRouteGps,
  };
}

export type { RoutePrompt };
