"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildWalkingRoute,
  refreshWalkingRoute,
  trimWalkingRouteToVisible,
  type WalkingRoute,
} from "@/lib/route";
import {
  diffRouteByStatus,
  routeCandidateHouses,
  snapshotRouteHouses,
} from "@/lib/route-changes";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { ResolvedOrigin } from "@/lib/distance-origin";
import type { HouseSet } from "@/lib/house-set";
import { shouldSkipRoutePrompt } from "@/lib/route-prompts";
import type { PublicHouse } from "@/lib/types";

function originPoint(origin: ResolvedOrigin) {
  return { lat: origin.lat, lng: origin.lng };
}

type RoutePrompt = {
  kind: "enter-route" | "filter-change" | "status-change";
  title: string;
  description: string;
  confirmLabel: string;
  removedHouses?: { name: string; reason: string }[];
  addedHouses?: { name: string; reason: string }[];
  onConfirm: (includeNewHouses: boolean) => void;
};

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
  now,
  setRoutePrompt,
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
  skippedIds: string[];
  origin: ResolvedOrigin;
  accessibleOnly: boolean;
  gps: { lat: number; lng: number } | null;
  geoRefresh: () => void;
  setAskedLocation: (value: boolean) => void;
  onBeforeEnter: () => void;
  now: Date;
  setRoutePrompt: (prompt: RoutePrompt | null) => void;
}) {
  const [routeMode, setRouteMode] = useState(false);
  const [pinnedRoute, setPinnedRoute] = useState<WalkingRoute | null>(null);
  const [routeFitTick, setRouteFitTick] = useState(0);
  const pendingRouteGps = useRef(false);
  const routeSnapshotRef = useRef<Map<string, PublicHouse>>(new Map());
  const statusPromptOpenRef = useRef(false);
  const visibleKey = useMemo(
    () => visible.map((house) => house.id).sort().join("\0"),
    [visible],
  );
  const housesKey = useMemo(
    () =>
      houses
        .map((house) => `${house.id}:${house.updatedAt}:${house.visit}:${house.ownerFrozenUntil ?? ""}`)
        .sort()
        .join("\0"),
    [houses],
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
      now,
    });
  }, [routeCandidates, accessibleOnly, origin, now]);

  const rebuildPinnedRoute = useCallback(
    (fit = false) => {
      setPinnedRoute(filterRoute);
      routeSnapshotRef.current = snapshotRouteHouses(filterRoute, houses);
      if (fit) setRouteFitTick((n) => n + 1);
    },
    [filterRoute, houses],
  );

  const pinCurrentRoute = useCallback(
    (fit = false) => {
      rebuildPinnedRoute(fit);
    },
    [rebuildPinnedRoute],
  );

  const applyStatusRouteChange = useCallback(
    (includeNewHouses: boolean) => {
      if (!filterRoute) {
        setPinnedRoute(null);
        routeSnapshotRef.current = new Map();
        return;
      }
      if (includeNewHouses) {
        rebuildPinnedRoute(false);
        return;
      }
      setPinnedRoute((current) => {
        if (!current) return filterRoute;
        const candidateIds = new Set(routeCandidates.map((house) => house.id));
        const trimmed = trimWalkingRouteToVisible(current, candidateIds);
        const next =
          trimmed &&
          refreshWalkingRoute(trimmed, originPoint(origin), {
            startedFrom: origin.kind,
            accessible: accessibleOnly,
            originLabel: origin.label,
          });
        routeSnapshotRef.current = snapshotRouteHouses(next, houses);
        return next;
      });
    },
    [
      accessibleOnly,
      filterRoute,
      houses,
      origin,
      rebuildPinnedRoute,
      routeCandidates,
    ],
  );

  useEffect(() => {
    if (!routeMode || !pendingRouteGps.current || !gps) return;
    pendingRouteGps.current = false;
    setPinnedRoute((current) => {
      const base = current ?? filterRoute;
      if (!base) return filterRoute;
      const next = refreshWalkingRoute(base, { lat: gps.lat, lng: gps.lng }, {
        startedFrom: "gps",
        accessible: accessibleOnly,
        originLabel: origin.label,
      });
      routeSnapshotRef.current = snapshotRouteHouses(next, houses);
      return next;
    });
  }, [routeMode, gps, filterRoute, accessibleOnly, origin.label, houses]);

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
      const next = refreshWalkingRoute(trimmed, originPoint(origin), {
        startedFrom: origin.kind,
        accessible: accessibleOnly,
        originLabel: origin.label,
      });
      routeSnapshotRef.current = snapshotRouteHouses(next, houses);
      return next;
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
    houses,
  ]);

  useEffect(() => {
    if (!routeMode || !pinnedRoute || statusPromptOpenRef.current) return;
    const diff = diffRouteByStatus(
      pinnedRoute,
      houses,
      filters,
      { ...filterContext, skippedIds },
      routeSnapshotRef.current,
    );
    if (!diff) return;
    if (shouldSkipRoutePrompt("status-change")) {
      applyStatusRouteChange(diff.added.length > 0);
      return;
    }
    statusPromptOpenRef.current = true;
    setRoutePrompt({
      kind: "status-change",
      title: "לעדכן את המסלול?",
      description:
        "מצב הבתים השתנה. «ביטול» משאיר את המסלול כמו שהוא; «עדכון» מתאים את הרשימה.",
      confirmLabel: "עדכון המסלול",
      removedHouses: diff.removed,
      addedHouses: diff.added,
      onConfirm: (includeNew) => {
        statusPromptOpenRef.current = false;
        applyStatusRouteChange(includeNew);
      },
    });
  }, [
    routeMode,
    pinnedRoute,
    housesKey,
    filters,
    filterContext,
    skippedIds.join("\0"),
    houses,
    Math.floor(now.getTime() / 60_000),
    setRoutePrompt,
    applyStatusRouteChange,
  ]);

  useEffect(() => {
    if (!routeMode) {
      statusPromptOpenRef.current = false;
      return;
    }
    if (pinnedRoute) {
      routeSnapshotRef.current = snapshotRouteHouses(pinnedRoute, houses);
    }
  }, [routeMode, pinnedRoute, housesKey, houses]);

  function exitRouteMode() {
    pendingRouteGps.current = false;
    setRouteMode(false);
    setPinnedRoute(null);
    routeSnapshotRef.current = new Map();
    statusPromptOpenRef.current = false;
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

  function acknowledgeRouteSnapshot() {
    if (!pinnedRoute) {
      routeSnapshotRef.current = new Map();
      return;
    }
    routeSnapshotRef.current = snapshotRouteHouses(pinnedRoute, houses);
    statusPromptOpenRef.current = false;
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
    acknowledgeRouteSnapshot,
  };
}
