"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildWalkingRoute,
  refreshWalkingRoute,
  trimWalkingRouteToVisible,
  type WalkingRoute,
} from "@/lib/route";
import { rebuildRouteAfterSkipChange, routeCandidateHouses } from "@/lib/route-changes";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { ResolvedOrigin } from "@/lib/distance-origin";
import type { HouseSet } from "@/lib/house-set";
import { captureRouteDisplayOrders } from "@/lib/route-display-order";
import { readRouteMode, writeRouteMode } from "@/lib/route-mode";
import type { PublicHouse } from "@/lib/types";

function originPoint(origin: ResolvedOrigin) {
  return { lat: origin.lat, lng: origin.lng };
}

/** Re-optimize stop order only when the user picks a new starting point — not on live GPS drift. */
function shouldReoptimizeRoute(current: WalkingRoute, origin: ResolvedOrigin) {
  if (current.startedFrom !== origin.kind) return true;
  if (origin.kind === "gps") return false;
  return current.origin.lat !== origin.lat || current.origin.lng !== origin.lng;
}

export function useNeighborhoodRoute({
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
  const [pinnedRoute, setPinnedRouteState] = useState<WalkingRoute | null>(null);
  const setPinnedRoute = useCallback((route: WalkingRoute | null) => {
    setPinnedRouteState(route);
  }, []);
  const commitSessionPlan = useCallback((route: WalkingRoute | null) => {
    setRouteSessionPlan(route);
    if (route) setRouteSessionDisplayOrders(captureRouteDisplayOrders(route));
  }, []);
  const [routeSessionDisplayOrders, setRouteSessionDisplayOrders] =
    useState<Map<string, number> | null>(null);
  /** Full tour geometry for map/list progress — updates on skip/rebuild, not on in-order visits. */
  const [routeSessionPlan, setRouteSessionPlan] = useState<WalkingRoute | null>(null);
  const pendingRouteGps = useRef(false);
  const lastVisitedCountRef = useRef(0);
  const recaptureDisplayOrdersAfterVisitClearRef = useRef(false);
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

  const pinCurrentRoute = useCallback(() => {
    if (!filterRoute) return;
    setPinnedRoute(filterRoute);
    commitSessionPlan(filterRoute);
  }, [filterRoute, setPinnedRoute, commitSessionPlan]);

  const clearPendingRouteGps = useCallback(() => {
    pendingRouteGps.current = false;
  }, []);

  useEffect(() => {
    if (!routeMode || !pendingRouteGps.current || !gps) return;
    pendingRouteGps.current = false;
    setPinnedRouteState((current) => {
      const base = current ?? filterRoute;
      if (!base) return filterRoute;
      const refreshed = refreshWalkingRoute(base, { lat: gps.lat, lng: gps.lng }, {
        startedFrom: "gps",
        accessible: accessibleOnly,
        originLabel: origin.label,
      });
      setRouteSessionPlan((plan) =>
        plan ? refreshWalkingRoute(plan, { lat: gps.lat, lng: gps.lng }, {
          startedFrom: "gps",
          accessible: accessibleOnly,
          originLabel: origin.label,
        }) : refreshed,
      );
      return refreshed;
    });
  }, [routeMode, gps, filterRoute, accessibleOnly, origin.label]);

  useEffect(() => {
    if (!routeMode || pendingRouteGps.current) return;
    setPinnedRouteState((current) => {
      if (!current) return current;
      const routeOptions = {
        accessible: accessibleOnly,
        startedFrom: origin.kind,
        originLabel: origin.label,
      };
      if (shouldReoptimizeRoute(current, origin)) {
        return buildWalkingRoute(routeCandidates, originPoint(origin), routeOptions);
      }

      const context = { ...filterContext, skippedIds };
      const candidateIds = new Set(routeCandidates.map((house) => house.id));
      const currentStopIds = current.stops.map((stop) => stop.house.id);
      const visitedSet = new Set(filterContext.visitedIds);
      /** Visited stops stay on the pinned tour — only skip/filter may remove them. */
      const stopLostFromRoute = currentStopIds.some(
        (id) => !candidateIds.has(id) && !visitedSet.has(id),
      );
      const visibleForTrim = new Set(candidateIds);
      for (const stop of current.stops) {
        for (const house of stop.houses) {
          if (visitedSet.has(house.id)) visibleForTrim.add(house.id);
        }
      }

      if (!stopLostFromRoute) {
        if (current.accessible === accessibleOnly) return current;
        const trimmed = trimWalkingRouteToVisible(current, visibleForTrim);
        if (!trimmed) return null;
        return refreshWalkingRoute(trimmed, originPoint(origin), routeOptions);
      }

      return rebuildRouteAfterSkipChange(
        current,
        houses,
        filters,
        context,
        skippedIds,
        false,
        originPoint(origin),
        routeOptions,
      );
    });
  }, [
    routeMode,
    houses,
    filters,
    filterContext,
    skippedIds,
    origin.lat,
    origin.lng,
    origin.kind,
    origin.label,
    accessibleOnly,
    routeCandidates,
  ]);

  useEffect(() => {
    if (!routeMode || pinnedRoute) return;
    pinCurrentRoute();
  }, [routeMode, pinnedRoute, pinCurrentRoute]);

  useEffect(() => {
    if (!routeMode) {
      lastVisitedCountRef.current = 0;
      recaptureDisplayOrdersAfterVisitClearRef.current = false;
      return;
    }
    if (visitedIds.length === 0 && lastVisitedCountRef.current > 0) {
      recaptureDisplayOrdersAfterVisitClearRef.current = true;
    }
    lastVisitedCountRef.current = visitedIds.length;
  }, [routeMode, visitedIds.length]);

  useEffect(() => {
    if (!routeMode || !pinnedRoute) return;
    setRouteSessionDisplayOrders((prev) => {
      if (
        recaptureDisplayOrdersAfterVisitClearRef.current &&
        pinnedRoute.stops.length > 0
      ) {
        recaptureDisplayOrdersAfterVisitClearRef.current = false;
        return captureRouteDisplayOrders(pinnedRoute);
      }
      if (!prev) return captureRouteDisplayOrders(pinnedRoute);
      return prev;
    });
  }, [routeMode, pinnedRoute]);

  function exitRouteMode() {
    pendingRouteGps.current = false;
    writeRouteMode(false);
    setRouteMode(false);
    setPinnedRoute(null);
    setRouteSessionDisplayOrders(null);
    setRouteSessionPlan(null);
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
      pinCurrentRoute();
    };
    proceed();
  }

  return {
    routeMode,
    pinnedRoute,
    setPinnedRoute,
    filterRoute,
    routeCandidates,
    pinCurrentRoute,
    enterRouteMode,
    exitRouteMode,
    pendingRouteGps,
    clearPendingRouteGps,
    routeSessionDisplayOrders,
    routeSessionPlan,
    commitSessionPlan,
  };
}
