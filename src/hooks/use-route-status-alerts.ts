"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  diffActiveRouteStatusChanges,
  snapshotRouteHouses,
  type RouteStatusChangeEntry,
} from "@/lib/route-changes";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { HouseSet } from "@/lib/house-set";
import type { PublicHouse } from "@/lib/types";
import type { WalkingRoute } from "@/lib/route";

const BACKGROUND_AWAY_MS = 3_000;

export function useRouteStatusAlerts({
  routeMode,
  activeRoute,
  displayHouses,
  filters,
  filterContext,
  catalogUpdatedAt,
}: {
  routeMode: boolean;
  activeRoute: WalkingRoute | null;
  displayHouses: PublicHouse[];
  filters: HouseFiltersState;
  filterContext: {
    houseSet: HouseSet;
    likedIds: string[];
    visitedIds: string[];
    skippedIds: string[];
    now: Date;
  };
  catalogUpdatedAt?: string;
}) {
  const [changes, setChanges] = useState<RouteStatusChangeEntry[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [fromBackground, setFromBackground] = useState(false);
  const snapshotRef = useRef<Map<string, PublicHouse>>(new Map());
  const snapshotReadyRef = useRef(false);
  const hiddenAtRef = useRef<number | null>(null);
  const pendingBackgroundRef = useRef(false);

  const reset = useCallback(() => {
    snapshotRef.current = new Map();
    snapshotReadyRef.current = false;
    setChanges([]);
    setSheetOpen(false);
    setBannerDismissed(false);
    setFromBackground(false);
    pendingBackgroundRef.current = false;
  }, []);

  const mergeChanges = useCallback((incoming: RouteStatusChangeEntry[]) => {
    if (incoming.length === 0) return;
    setChanges((prev) => {
      const byId = new Map(prev.map((item) => [item.houseId, item]));
      for (const change of incoming) byId.set(change.houseId, change);
      return [...byId.values()];
    });
    setBannerDismissed(false);
    if (pendingBackgroundRef.current) {
      pendingBackgroundRef.current = false;
      setFromBackground(true);
    }
  }, []);

  const runDiff = useCallback(() => {
    if (!routeMode || !activeRoute) {
      reset();
      return;
    }
    const nextSnapshot = snapshotRouteHouses(activeRoute, displayHouses);
    if (!snapshotReadyRef.current) {
      snapshotRef.current = nextSnapshot;
      snapshotReadyRef.current = true;
      return;
    }
    const incoming = diffActiveRouteStatusChanges(
      activeRoute,
      displayHouses,
      filters,
      filterContext,
      snapshotRef.current,
    );
    snapshotRef.current = nextSnapshot;
    mergeChanges(incoming);
  }, [
    activeRoute,
    displayHouses,
    filterContext,
    filters,
    mergeChanges,
    reset,
    routeMode,
  ]);

  useEffect(() => {
    runDiff();
  }, [runDiff, catalogUpdatedAt]);

  useEffect(() => {
    if (!routeMode) return;

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (hiddenAt != null && Date.now() - hiddenAt >= BACKGROUND_AWAY_MS) {
        pendingBackgroundRef.current = true;
      }
    }

    function onCatalogRefreshed() {
      runDiff();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("hw-catalog-refreshed", onCatalogRefreshed);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("hw-catalog-refreshed", onCatalogRefreshed);
    };
  }, [routeMode, runDiff]);

  function openSheet() {
    setSheetOpen(true);
    setBannerDismissed(true);
  }

  function dismissBanner() {
    setBannerDismissed(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setChanges([]);
    setBannerDismissed(false);
    setFromBackground(false);
  }

  return {
    changes,
    sheetOpen,
    bannerDismissed,
    fromBackground,
    openSheet,
    dismissBanner,
    closeSheet,
    setSheetOpen,
  };
}
