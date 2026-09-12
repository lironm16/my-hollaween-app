"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildWalkingRoute,
  refreshWalkingRoute,
  trimWalkingRouteToVisible,
  type WalkingRoute,
} from "@/lib/route";
import { routeCandidateHouses } from "@/lib/route-changes";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { ResolvedOrigin } from "@/lib/distance-origin";
import type { HouseSet } from "@/lib/house-set";
import { readRouteMode, writeRouteMode } from "@/lib/route-mode";
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
  skippedIds,
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
    skippedIds: string[];
    now: Date;
  };
  visitedIds: string[];
  skippedIds: string[];
  origin: ResolvedOrigin;
  accessibleOnly: boolean;
  gps: { lat: number; lng: number } | null;
  geoRefresh: () => void;
  setAskedLocation: (value: boolean) => void;
  onBeforeEnter: () => void;
}) {
  const [routeMode, setRouteMode] = useState(() => readRouteMode());
  const [pinnedRoute, setPinnedRoute] = useState<WalkingRoute | null>(null);
  const [routeFitTick, setRouteFitTick] = useState(0);
  const pendingRouteGps = useRef(false);
  const visibleKey = useMemo(
    () => visible.map((house) => house.id).sort().join("\0"),
    [visible],
  );

  const routeCandidates = useMemo(
    () =>
      routeCandidateHouses(houses, filters, {
        ...filterContext,
        skippedIds,
      }),
    [houses, filters, filterContext, skippedIds],
  );

  const filterRoute = useMemo(() => {
    return buildWalkingRoute(routeCandidates, originPoint(origin), {
      accessible: accessibleOnly,
      startedFrom: origin.kind,
      originLabel: origin.label,
    });
  }, [routeCandidates, accessibleOnly, origin]);

  const rebuildPinnedRoute = useCallback(
    (fit = false) => {
      setPinnedRoute(filterRoute);
      if (fit) setRouteFitTick((n) => n + 1);
    },
    [filterRoute],
  );

  const pinCurrentRoute = useCallback(
    (fit = false) => {
      rebuildPinnedRoute(fit);
    },
    [rebuildPinnedRoute],
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
      const candidateIds = new Set(routeCandidates.map((house) => house.id));
      const trimmed = trimWalkingRouteToVisible(current, candidateIds);
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
    skippedIds.join("\0"),
    origin.lat,
    origin.lng,
    origin.kind,
    origin.label,
    accessibleOnly,
    routeCandidates,
  ]);

  useEffect(() => {
    if (!routeMode || pinnedRoute) return;
    pinCurrentRoute(false);
  }, [routeMode, pinnedRoute, pinCurrentRoute]);

  function exitRouteMode() {
    pendingRouteGps.current = false;
    writeRouteMode(false);
    setRouteMode(false);
    setPinnedRoute(null);
  }

  function enterRouteMode() {
    if (routeMode) return;
    const proceed = () => {
      onBeforeEnter();
      writeRouteMode(true);
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
    routeCandidates,
    pinCurrentRoute,
    enterRouteMode,
    exitRouteMode,
    pendingRouteGps,
    rebuildPinnedRoute,
  };
}
