"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildWalkingRoute,
  refreshWalkingRoute,
  trimWalkingRouteToVisible,
  type WalkingRoute,
} from "@/lib/route";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { ResolvedOrigin } from "@/lib/distance-origin";
import type { HouseSet } from "@/lib/house-set";
import type { PublicHouse } from "@/lib/types";

function originPoint(origin: ResolvedOrigin) {
  return { lat: origin.lat, lng: origin.lng };
}

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
  onBeforeEnter: () => void;
}) {
  const [routeMode, setRouteMode] = useState(false);
  const [pinnedRoute, setPinnedRoute] = useState<WalkingRoute | null>(null);
  const [routeFitTick, setRouteFitTick] = useState(0);
  const pendingRouteGps = useRef(false);
  const visibleKey = useMemo(
    () => visible.map((house) => house.id).sort().join("\0"),
    [visible],
  );

  const filterRoute = useMemo(() => {
    const routeHouses = filters.unvisitedOnly
      ? visible.filter((house) => !visitedIds.includes(house.id))
      : visible;
    return buildWalkingRoute(routeHouses, originPoint(origin), {
      accessible: accessibleOnly,
      startedFrom: origin.kind,
      originLabel: origin.label,
    });
  }, [visible, visitedIds, accessibleOnly, origin, filters.unvisitedOnly]);

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
    setPinnedRoute((current) => {
      const base = current ?? filterRoute;
      if (!base) return filterRoute;
      return refreshWalkingRoute(base, { lat: gps.lat, lng: gps.lng }, {
        startedFrom: "gps",
        accessible: accessibleOnly,
        originLabel: origin.label,
      });
    });
  }, [routeMode, gps, filterRoute, accessibleOnly, origin.label]);

  useEffect(() => {
    if (!routeMode || pendingRouteGps.current) return;
    setPinnedRoute((current) => {
      if (!current) return current;
      const visibleIds = new Set(visible.map((house) => house.id));
      const trimmed = trimWalkingRouteToVisible(current, visibleIds);
      if (!trimmed) return null;
      const stopIds = trimmed.stops.map((stop) => stop.house.id).join("\0");
      const currentIds = current.stops.map((stop) => stop.house.id).join("\0");
      const originUnchanged =
        current.origin.lat === origin.lat && current.origin.lng === origin.lng;
      if (stopIds === currentIds && originUnchanged && current.accessible === accessibleOnly) {
        return current;
      }
      return refreshWalkingRoute(trimmed, originPoint(origin), {
        startedFrom: origin.kind,
        accessible: accessibleOnly,
        originLabel: origin.label,
      });
    });
  }, [
    routeMode,
    visibleKey,
    origin.lat,
    origin.lng,
    origin.kind,
    origin.label,
    accessibleOnly,
    visible,
  ]);

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
    proceed();
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
