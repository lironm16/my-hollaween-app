"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AppHeader } from "@/components/app-header";
import { CatalogMetaChip } from "@/components/catalog-meta-chip";
import { FiltersSheet } from "@/components/filter-menu";
import { HouseFiltersContent } from "@/components/house-filters-content";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { HouseList } from "@/components/house-list";
import type { HouseCardActionContext } from "@/components/house-card-actions";
import { MapStats, StatsSummary } from "@/components/map-stats";
import { MapHouseSheet } from "@/components/map-house-sheet";
import { HouseEditFlowPanels, useHouseEditFlow } from "@/components/house-edit-flow";
import { NeighborhoodStatusBanners } from "@/components/neighborhood-status-banners";
import { RouteChangeBanner, routeChangeBannerMessage } from "@/components/route-change-banner";
import { RouteChangesSheet } from "@/components/route-changes-sheet";
import { TempSkipRestoreAlerts } from "@/components/temp-skip-restore-alert";
import {
  emitTempSkipRestoreAlert,
  useTempSkipRestoreAlerts,
} from "@/hooks/use-temp-skip-restore-alerts";
import { EventCountdownGate } from "@/components/event-countdown-gate";
import { NeighborhoodToolbar } from "@/components/neighborhood-toolbar";
import { RouteShareImportDialog } from "@/components/route-share-import-dialog";
import { OriginPickerSheet } from "@/components/origin-picker";
import { RouteList, type RouteListItem } from "@/components/route-list";
import { SkipHouseDialog } from "@/components/skip-house-dialog";
import { VisitSkipConflictDialog } from "@/components/visit-skip-conflict-dialog";
import { LikeCheer } from "@/components/like-cheer";
import { RouteCompleteCheer } from "@/components/route-complete-cheer";
import { VisitCheer } from "@/components/visit-cheer";
import { GemResetConfirmDialog } from "@/components/gem-reset-confirm-dialog";
import { GemMapCompleteBanner } from "@/components/gem-map-complete-banner";
import {
  GemHuntOverlayLazy,
  GemHuntPanelLazy,
  preloadGemHuntChunks,
} from "@/components/gem-hunt/gem-hunt-lazy";
import { gemHuntFabVisible, gemHuntVisible } from "@/lib/gem-hunt-enabled";
import { useGemProgress } from "@/hooks/use-gem-progress";
import { loadGemCollectedIds } from "@/lib/gem-progress";
import { useStandingStill } from "@/hooks/use-standing-still";
import { canCollectGem, userWithinGemHuntRange } from "@/lib/gem-hunt";
import { syncGemMonsterAssignment } from "@/lib/gem-monsters";
import { pickGemHuntTarget } from "@/lib/gem-hunt-target";
import { prepareGemHuntSensors, stopGemHuntCameraStream } from "@/lib/gem-hunt-sensors";
import { useRouteGeometry } from "@/hooks/use-route-geometry";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useAdminHouses } from "@/hooks/use-admin-houses";
import { useFilterDraft } from "@/hooks/use-filter-draft";
import { useHouseActions } from "@/hooks/use-house-actions";
import { useHouseFilters, countActiveFilters } from "@/hooks/use-house-filters";
import { useHouseSelection } from "@/hooks/use-house-selection";
import { useMergedHouses } from "@/hooks/use-merged-houses";
import { useNeighborhoodRoute } from "@/hooks/use-neighborhood-route";
import { useOriginPick } from "@/hooks/use-origin-pick";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { useUserLocation } from "@/hooks/use-user-location";
import { useVisitedHouses } from "@/hooks/use-visited-houses";
import { useSkippedHouses } from "@/hooks/use-skipped-houses";
import { useDistanceOrigin } from "@/hooks/use-distance-origin";
import { useHouseSet } from "@/hooks/use-house-set";
import { useMapListUiLock } from "@/hooks/use-map-list-ui-lock";
import { setMapListSuspended } from "@/lib/map-list-suspend";
import { config } from "@/lib/config";
import { applyClockSearchParams } from "@/lib/app-clock";
import { useAppNow } from "@/hooks/use-app-clock";
import {
  loadCatalogCacheSync,
  notifyCatalogChanged,
  removeOwnedHouse,
  forgetPublishedHouse,
  saveOwnedHouse,
} from "@/lib/offline-db";
import {
  readHomeView,
  writeHomeView,
  type HomeView,
} from "@/lib/home-view";
import { resolveCatalogHouses } from "@/lib/catalog-houses";
import {
  catalogHasRealHouses,
  HOUSE_SET_LABELS,
  countSkippedInSet,
  countVisitedInSet,
  houseMatchesSet,
} from "@/lib/house-set";
import { filterHouses, houseFilterMismatchReasons, routeHouseIds } from "@/lib/filter-houses";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { estimateWalkingMeters } from "@/lib/walk-distance-estimate";
import { buildWalkingRouteOrdered } from "@/lib/route";
import { isRouteFullyVisited } from "@/lib/route-completion";
import {
  decodeSharedRoutePayload,
  housesForSharedRoute,
  readPendingRouteShare,
  ROUTE_SHARE_QUERY,
  writePendingRouteShare,
  type SharedRoutePayload,
} from "@/lib/route-share";
import { diffRouteBySkippedIds, rebuildRouteAfterSkipChange } from "@/lib/route-changes";
import { useRouteStatusAlerts } from "@/hooks/use-route-status-alerts";
import { drainPendingRouteRestores } from "@/lib/route-mode";
import {
  availableTemporaryRestoreOptions,
  skipStatusSnapshot,
  shouldEmitTemporarySkipRestoreAlert,
  temporaryRestoreAlertText,
  temporarySkipRestoreMet,
  type TemporaryRestoreTriggerId,
  type SkipReasonId,
} from "@/lib/skip-reasons";
import { houseSelectionAnnouncement } from "@/lib/map-a11y";
import {
  dismissVisitSkipConflictPrompt,
  shouldAskVisitSkipConflict,
} from "@/lib/visit-skip-conflict";
import type { Catalog, PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Stable empty array for filter context — never use `[]` inline in useMemo deps. */
const NO_GEM_COLLECTED_IDS: string[] = [];

export function NeighborhoodApp({
  initialCatalog,
  focusId = null,
  routeShareParam = null,
}: {
  initialCatalog?: Catalog | null;
  focusId?: string | null;
  routeShareParam?: string | null;
}) {
  const { catalog, loading, ready, offline, unreachable, error, source, pollSeconds, refresh } =
    useCatalog(initialCatalog);
  const catalogUpdatedAt = catalog?.updatedAt;
  const { admin } = useAdminSession();
  const geo = useUserLocation({ watch: false });
  const { setWatchEnabled } = geo;
  const gps = geo.location;
  const gemHuntActive = gemHuntVisible(admin);
  const gems = useGemProgress();
  const [mapGemHouse, setMapGemHouse] = useState<PublicHouse | null>(null);
  const gemBadgePendingRef = useRef(false);
  const [mapGemBadgeCount, setMapGemBadgeCount] = useState(() =>
    typeof window === "undefined" ? 0 : loadGemCollectedIds().length,
  );
  const [gemResetHouse, setGemResetHouse] = useState<PublicHouse | null>(null);
  const mapGemStanding = useStandingStill(gps, gemHuntActive && Boolean(mapGemHouse));
  const gpsAllowed =
    geo.status === "idle" || geo.status === "pending" || geo.status === "ready";

  useEffect(() => {
    if (!gemHuntActive || !mapGemHouse) return;
    setWatchEnabled(true);
    void geo.refresh();
  }, [gemHuntActive, mapGemHouse, geo.refresh, setWatchEnabled]);

  const { choice: originChoice, resolved: origin, setChoice: setOriginChoice } = useDistanceOrigin(gps);
  const { houseSet } = useHouseSet();
  const activeHouseSet = admin ? houseSet : "real";
  const view = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("hw-home-view", onStoreChange);
      return () => window.removeEventListener("hw-home-view", onStoreChange);
    },
    readHomeView,
    () => "map" as HomeView,
  );

  const {
    filters,
    update: updateFilters,
  } = useHouseFilters();
  const { accessibleOnly, likedOnly } = filters;

  const [askedLocation, setAskedLocation] = useState(false);
  const [skipDialogHouse, setSkipDialogHouse] = useState<PublicHouse | null>(null);
  const [visitSkipConflict, setVisitSkipConflict] = useState<{
    kind: "visit" | "skip";
    house: PublicHouse;
  } | null>(null);
  const { alerts: tempRestoreAlerts, dismiss: dismissTempRestoreAlert } = useTempSkipRestoreAlerts();
  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const skips = useSkippedHouses();
  const owned = useOwnedHouses();
  const now = useAppNow();
  useEffect(() => {
    applyClockSearchParams(window.location.search);
  }, []);

  const [routeSharePrompt, setRouteSharePrompt] = useState<SharedRoutePayload | null>(null);

  useEffect(() => {
    let payload: SharedRoutePayload | null = null;
    if (routeShareParam) {
      payload = decodeSharedRoutePayload(routeShareParam);
    }
    if (!payload && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const fromUrl = url.searchParams.get(ROUTE_SHARE_QUERY);
      if (fromUrl) payload = decodeSharedRoutePayload(fromUrl);
    }
    if (payload) writePendingRouteShare(payload);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has(ROUTE_SHARE_QUERY)) return;
    url.searchParams.delete(ROUTE_SHARE_QUERY);
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", next);
  }, [routeShareParam]);

  function setView(next: HomeView) {
    writeHomeView(next);
  }

  const {
    adminHouses,
    applyAdminHouse,
    removeAdminHouse,
  } = useAdminHouses({ admin, refresh, catalogUpdatedAt });

  const wasAdmin = useRef(false);

  const editCodeById = useMemo(() => {
    const map = new Map<string, string>();
    for (const house of adminHouses) map.set(house.id, house.editCode);
    return map;
  }, [adminHouses]);

  const catalogHouses = useMemo(() => resolveCatalogHouses(catalog), [catalog]);
  const houses = useMergedHouses({
    catalogHouses,
    owned,
    admin,
    adminHouses,
    includeCatalogWhenAdmin: true,
  });
  const lastHousesRef = useRef<PublicHouse[]>([]);
  const displayHouses = useMemo(() => {
    if (houses.length > 0) {
      lastHousesRef.current = houses;
      return houses;
    }
    if (lastHousesRef.current.length > 0) return lastHousesRef.current;
    const cached = loadCatalogCacheSync()?.houses;
    if (cached?.length) {
      lastHousesRef.current = cached;
      return cached;
    }
    return houses;
  }, [houses]);

  const { houses: mapListHouses, now: mapListNow } = useMapListUiLock(displayHouses, now);

  const housesForSkipCount = useMemo(() => {
    const byId = new Map(displayHouses.map((house) => [house.id, house]));
    for (const house of catalog?.houses ?? []) {
      if (!byId.has(house.id)) byId.set(house.id, house);
    }
    return [...byId.values()];
  }, [displayHouses, catalog?.houses]);

  const filterContext = useMemo(
    () => ({
      houseSet: activeHouseSet,
      likedIds: likes.likedIds,
      visitedIds: visits.visitedIds,
      skippedIds: skips.skippedIds,
      gemCollectedIds: gemHuntActive ? gems.collectedIds : NO_GEM_COLLECTED_IDS,
      now: mapListNow,
    }),
    [activeHouseSet, likes.likedIds, visits.visitedIds, skips.skippedIds, gemHuntActive, gems.collectedIds, mapListNow],
  );

  const mapHouses = useMemo(
    () => mapListHouses.filter((house) => houseMatchesSet(house, activeHouseSet)),
    [mapListHouses, activeHouseSet],
  );
  useEffect(() => {
    if (gemHuntActive) syncGemMonsterAssignment(mapHouses);
  }, [gemHuntActive, mapHouses]);
  const visible = useMemo(
    () => filterHouses(mapListHouses, filters, filterContext),
    [mapListHouses, filters, filterContext],
  );
  const showBootstrapSpinner =
    displayHouses.length === 0 && !catalogHasRealHouses(catalog) && loading;
  const matchedIds = useMemo(() => new Set(visible.map((house) => house.id)), [visible]);
  const filterDimActive = matchedIds.size < mapHouses.length;
  const matchedIdsKey = useMemo(
    () => (filterDimActive ? visible.map((house) => house.id).join("\0") : ""),
    [filterDimActive, visible],
  );
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const selection = useHouseSelection({ focusId, visible, houses: mapListHouses, clusterHouses: mapHouses });
  const { resetForNavigation } = selection;

  const gemAllCollected = useMemo(() => {
    if (!gemHuntActive || mapHouses.length === 0) return false;
    return mapHouses.every((h) => gems.collected(h.id));
  }, [gemHuntActive, mapHouses, gems.collectedIds]);

  const openMapGemHunt = useCallback(async () => {
    if (gemAllCollected) {
      window.location.assign("/gem-bag");
      return;
    }
    preloadGemHuntChunks();
    setWatchEnabled(true);
    const freshGps = (await geo.refresh()) ?? gps;
    const target = pickGemHuntTarget(
      mapHouses,
      freshGps,
      (id) => gems.collected(id),
      selection.selected?.id ?? null,
    );
    if (!target) return;
    await prepareGemHuntSensors({ requestCamera: true });
    setMapGemHouse(target.house);
  }, [gemAllCollected, mapHouses, gps, gems, selection.selected?.id, geo, setWatchEnabled]);

  const openGemHuntForHouse = useCallback(
    async (house: PublicHouse) => {
      if (gems.collected(house.id)) return;
      preloadGemHuntChunks();
      setView("map");
      selection.selectOnMap(house);
      setWatchEnabled(true);
      await geo.refresh();
      await prepareGemHuntSensors({ requestCamera: true });
      setMapGemHouse(house);
    },
    [gems, geo, selection, setWatchEnabled],
  );

  useEffect(() => {
    if (!gemBadgePendingRef.current) {
      setMapGemBadgeCount(gems.collectedIds.length);
    }
  }, [gems.collectedIds.length]);

  const celebrateGemCollect = useCallback(() => {
    setMapGemBadgeCount(loadGemCollectedIds().length);
  }, []);

  const handleToggleGemMenu = useCallback(
    (house: PublicHouse) => {
      if (gems.collected(house.id)) {
        setGemResetHouse(house);
        return;
      }
      void openGemHuntForHouse(house);
    },
    [gems, openGemHuntForHouse],
  );

  const confirmGemReset = useCallback(() => {
    const house = gemResetHouse;
    if (!house) return;
    gems.resetHouse(house.id);
    gemBadgePendingRef.current = false;
    setGemResetHouse(null);
  }, [gemResetHouse, gems]);
  const editFlow = useHouseEditFlow();

  /** Load gem hunt UI after the sheet paints — keeps house detail snappy. */
  const [gemPanelReady, setGemPanelReady] = useState(false);
  useEffect(() => {
    if (!selection.selected || !gemHuntFabVisible(admin, now)) {
      setGemPanelReady(false);
      return;
    }
    setGemPanelReady(false);
    const run = () => setGemPanelReady(true);
    const idle = window.requestIdleCallback;
    if (typeof idle === "function") {
      const id = idle(run, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, 350);
    return () => window.clearTimeout(t);
  }, [selection.selected?.id, admin]);

  const ownedEditCode = useMemo(() => {
    if (!selection.editHouseId) return undefined;
    return owned.find((item) => item.id === selection.editHouseId)?.editCode;
  }, [owned, selection.editHouseId]);
  const canEditSelected = Boolean(admin || ownedEditCode);

  const {
    routeMode,
    pinnedRoute,
    setPinnedRoute,
    filterRoute,
    pinCurrentRoute,
    enterRouteMode: startRouteMode,
    exitRouteMode,
    pendingRouteGps,
  } = useNeighborhoodRoute({
    houses,
    filters,
    filterContext,
    visitedIds: visits.visitedIds,
    skippedIds: skips.skippedIds,
    origin,
    accessibleOnly,
    gps,
    geoRefresh: geo.refresh,
    setAskedLocation,
    onBeforeEnter: resetForNavigation,
  });

  const {
    filtersOpen,
    setFiltersOpen,
    sheetFilters,
    sheetActiveCount,
    sheetResultCount,
    visitWindowInvalid,
    patchFilterDraft,
    resetFilterDraft,
    commitFilterDraft,
  } = useFilterDraft({
    filters,
    updateFilters,
    houses: displayHouses,
    filterContext,
    routeMode,
    pinnedRoute,
    setPinnedRoute,
    origin,
    skippedIds: skips.skippedIds,
    now,
  });

  const originPick = useOriginPick({
    view,
    origin,
    originChoice,
    setOriginChoice,
    gps,
    gpsAllowed,
    geo,
    askedLocation,
    setAskedLocation,
    pendingRouteGps,
    pinCurrentRoute,
    onBeforePick: resetForNavigation,
  });

  useEffect(() => {
    setWatchEnabled(
      view === "map" ||
        routeMode ||
        originPick.originPickActive ||
        originPick.originPickerOpen,
    );
  }, [setWatchEnabled, view, routeMode, originPick.originPickActive, originPick.originPickerOpen]);

  useEffect(() => {
    if (wasAdmin.current && !admin) {
      resetForNavigation();
      void refresh(true);
    }
    wasAdmin.current = admin;
  }, [admin, refresh, resetForNavigation]);

  const walkingRoute = routeMode ? pinnedRoute : null;
  const activeRoute = routeMode ? (walkingRoute ?? filterRoute) : null;

  useEffect(() => {
    if (houses.length === 0) return;
    const pending = readPendingRouteShare();
    if (pending) setRouteSharePrompt(pending);
  }, [houses.length]);

  const housesById = useMemo(() => new Map(houses.map((house) => [house.id, house])), [houses]);

  const acceptSharedRoute = useCallback(() => {
    if (!routeSharePrompt) return;
    if (!routeMode) {
      originPick.exitOriginPick();
      startRouteMode();
    }
    const sharedHouses = housesForSharedRoute(routeSharePrompt.stopIds, housesById);
    const route = buildWalkingRouteOrdered(
      sharedHouses,
      { lat: origin.lat, lng: origin.lng },
      {
        accessible: accessibleOnly,
        startedFrom: origin.kind,
        originLabel: origin.label,
      },
    );
    if (!route) {
      toast.error("לא נמצאו בתים מהמסלול המשותף במפה שלכם");
    } else {
      setPinnedRoute(route);
      toast.success(`המסלול הוחלף · ${route.stops.length} עצירות`);
    }
    writePendingRouteShare(null);
    setRouteSharePrompt(null);
  }, [
    accessibleOnly,
    housesById,
    origin.kind,
    origin.label,
    origin.lat,
    origin.lng,
    originPick,
    routeMode,
    routeSharePrompt,
    setPinnedRoute,
    startRouteMode,
  ]);

  const declineSharedRoute = useCallback(() => {
    writePendingRouteShare(null);
    setRouteSharePrompt(null);
  }, []);

  const routeAlerts = useRouteStatusAlerts({
    routeMode,
    activeRoute,
    displayHouses,
    filters,
    filterContext,
    catalogUpdatedAt,
  });
  const visitCelebration = useCallback(
    (_id: string, nextVisitedIds: string[]) => {
      if (!routeMode || !walkingRoute) return "visit";
      return isRouteFullyVisited(walkingRoute, skips.skippedIds, nextVisitedIds)
        ? "route-complete"
        : "visit";
    },
    [routeMode, walkingRoute, skips.skippedIds],
  );
  const { onToggleLike, celebrateVisit, visitCheer, routeCompleteCheer, likeCheer } = useHouseActions(
    likes,
    visits,
    { visitCelebration },
  );

  const performToggleVisited = useCallback(
    (id: string) => {
      const marking = !visits.visited(id);
      const nextVisitedIds = marking
        ? [id, ...visits.visitedIds.filter((item) => item !== id)]
        : visits.visitedIds.filter((item) => item !== id);
      const nextSkippedIds =
        marking && skips.skipped(id)
          ? skips.skippedIds.filter((item) => item !== id)
          : skips.skippedIds;
      const ids = visits.toggle(id);
      if (marking) {
        celebrateVisit(id, ids);
      } else {
        selection.clearListFocus();
      }
      if (!routeMode) return;
      applyRouteAfterSkipChange(nextSkippedIds, !marking, nextVisitedIds);
    },
    [celebrateVisit, routeMode, selection.clearListFocus, skips.skippedIds, visits],
  );

  const onToggleVisited = useCallback(
    (id: string) => {
      const marking = !visits.visited(id);
      if (marking && skips.skipped(id) && shouldAskVisitSkipConflict()) {
        const house = houses.find((item) => item.id === id);
        if (house) {
          setVisitSkipConflict({ kind: "visit", house });
          return;
        }
      }
      performToggleVisited(id);
    },
    [houses, performToggleVisited, skips, visits],
  );
  const routeListItems = useMemo(() => {
    if (!routeMode || !activeRoute) return [];
    const routeIds = routeHouseIds(activeRoute);
    const skippedSet = new Set(skips.skippedIds);
    const activeItems = activeRoute.stops.flatMap((stop) =>
      stop.houses.map((house, houseIndex) => ({
        house,
        order: stop.order,
        hop: houseIndex > 0 ? "אותו בניין" : formatDistance(stop.fromPreviousMeters),
        skipped: false,
      })),
    );
    const visibleById = new Map(visible.map((house) => [house.id, house]));
    const originPoint = { lat: origin.lat, lng: origin.lng };
    const lastStop = activeRoute.stops[activeRoute.stops.length - 1];
    let tailCursor = lastStop
      ? { lat: lastStop.house.lat, lng: lastStop.house.lng }
      : originPoint;

    function appendTail(
      ids: string[],
      flags: { skipped: boolean; visitedTail?: boolean },
    ) {
      const items: RouteListItem[] = [];
      for (const id of ids) {
        const house = visibleById.get(id);
        if (!house) continue;
        const point = { lat: house.lat, lng: house.lng };
        const legM = estimateWalkingMeters(tailCursor, point);
        items.push({
          house,
          order: 0,
          hop: formatDistance(legM),
          skipped: flags.skipped,
          visitedTail: flags.visitedTail,
          distanceM: distanceMeters(originPoint, point),
        });
        tailCursor = point;
      }
      return items;
    }

    const visitedTail = appendTail(
      visits.visitedIds.filter((id) => !routeIds.has(id) && !skippedSet.has(id)),
      { skipped: false, visitedTail: true },
    );
    const skippedTail = appendTail(
      skips.skippedIds.filter((id) => !routeIds.has(id)),
      { skipped: true },
    );
    return [...activeItems, ...visitedTail, ...skippedTail];
  }, [
    routeMode,
    activeRoute,
    skips.skippedIds,
    visits.visitedIds,
    visible,
    origin.lat,
    origin.lng,
  ]);

  function applyRouteAfterSkipChange(
    nextSkippedIds: string[],
    includeNew: boolean,
    nextVisitedIds: string[] = filterContext.visitedIds,
  ) {
    setPinnedRoute(
      rebuildRouteAfterSkipChange(
        pinnedRoute,
        houses,
        filters,
        { ...filterContext, visitedIds: nextVisitedIds },
        nextSkippedIds,
        includeNew,
        { lat: origin.lat, lng: origin.lng },
        {
          accessible: accessibleOnly,
          startedFrom: origin.kind,
          originLabel: origin.label,
        },
      ),
    );
  }

  useEffect(() => {
    if (!routeMode || houses.length === 0) return;
    const pending = drainPendingRouteRestores();
    if (pending.length === 0) return;
    applyRouteAfterSkipChange(skips.skippedIds, true);
  }, [routeMode, houses.length, skips.skippedIds.join("\0")]);

  useEffect(() => {
    const houseById = new Map(housesForSkipCount.map((house) => [house.id, house]));
    const toRestore = skips.skippedIds.filter((id) => {
      const meta = skips.meta(id);
      if (!meta?.temporary) return false;
      const house = houseById.get(id);
      if (!house) return false;
      return temporarySkipRestoreMet(house, meta, now, filters);
    });
    if (toRestore.length === 0) return;
    for (const id of toRestore) {
      const house = houseById.get(id);
      const meta = skips.meta(id);
      if (!house || !meta) continue;
      if (shouldEmitTemporarySkipRestoreAlert(meta)) {
        emitTempSkipRestoreAlert({
          id,
          message: temporaryRestoreAlertText(house, meta),
        });
      }
    }
    const nextSkippedIds = skips.skippedIds.filter((id) => !toRestore.includes(id));
    for (const id of toRestore) skips.unskip(id);
    if (routeMode) {
      applyRouteAfterSkipChange(nextSkippedIds, true);
    }
  }, [routeMode, housesForSkipCount, now, filters, skips.skippedIds.join("\0")]);

  function applySkipHouse(
    house: PublicHouse,
    reason: SkipReasonId,
    temporary: boolean,
    restoreTriggers: TemporaryRestoreTriggerId[] = [],
  ) {
    const wasSkipped = skips.skipped(house.id);
    const meta = {
      reason,
      temporary,
      restoreTriggers: temporary && restoreTriggers.length > 0 ? restoreTriggers : undefined,
      statusKey: skipStatusSnapshot(house, now, filters),
      skippedAt: wasSkipped ? (skips.meta(house.id)?.skippedAt ?? new Date().toISOString()) : new Date().toISOString(),
    };
    const nextSkippedIds = wasSkipped
      ? skips.skippedIds
      : [house.id, ...skips.skippedIds.filter((item) => item !== house.id)];
    if (wasSkipped) {
      skips.update(house.id, meta);
    } else {
      skips.skip(house.id, meta);
    }
    skips.clearNote(house.id);
    if (routeMode && !wasSkipped) {
      const nextVisitedIds = visits.visited(house.id)
        ? visits.visitedIds.filter((item) => item !== house.id)
        : visits.visitedIds;
      applyRouteAfterSkipChange(nextSkippedIds, false, nextVisitedIds);
    }
  }

  function proceedWithSkipHouse(house: PublicHouse) {
    const editing = skips.skipped(house.id);
    const canTempSkip = availableTemporaryRestoreOptions(house, now, filters).length > 0;
    if (!editing && !canTempSkip) {
      applySkipHouse(house, "other", false);
      return;
    }
    setSkipDialogHouse(house);
  }

  function handleSkipHouse(id: string) {
    const house = houses.find((item) => item.id === id);
    if (!house) return;
    const editing = skips.skipped(id);
    if (!editing && visits.visited(id) && shouldAskVisitSkipConflict()) {
      setVisitSkipConflict({ kind: "skip", house });
      return;
    }
    proceedWithSkipHouse(house);
  }

  function confirmVisitSkipConflict(dismissFuture: boolean) {
    const pending = visitSkipConflict;
    setVisitSkipConflict(null);
    if (!pending) return;
    if (dismissFuture) dismissVisitSkipConflictPrompt();
    if (pending.kind === "visit") {
      performToggleVisited(pending.house.id);
      return;
    }
    proceedWithSkipHouse(pending.house);
  }

  function confirmSkipHouse(
    reason: SkipReasonId,
    temporary: boolean,
    restoreTriggers: TemporaryRestoreTriggerId[],
  ) {
    const house = skipDialogHouse;
    if (!house) return;
    setSkipDialogHouse(null);
    applySkipHouse(house, reason, temporary, restoreTriggers);
  }

  function unskipFromDialog() {
    const house = skipDialogHouse;
    if (!house) return;
    setSkipDialogHouse(null);
    handleRestoreHouse(house.id);
  }

  /** Restore one skipped house — no route-change prompt (explicit user action). */
  function handleRestoreHouse(id: string) {
    if (!skips.skipped(id)) return;
    const nextSkippedIds = skips.skippedIds.filter((item) => item !== id);
    skips.unskip(id);
    if (!routeMode) return;
    const { added } = diffRouteBySkippedIds(
      pinnedRoute,
      houses,
      filters,
      filterContext,
      nextSkippedIds,
    );
    applyRouteAfterSkipChange(nextSkippedIds, added.length > 0);
  }
  const { line: routeLine } = useRouteGeometry(activeRoute, routeMode);
  const summaryProps = {
    filteredHouses: visible.length,
    route: activeRoute ?? filterRoute,
    skippedCount: countSkippedInSet(skips.skippedIds, housesForSkipCount, activeHouseSet),
    visitedCount: countVisitedInSet(visits.visitedIds, housesForSkipCount, activeHouseSet),
  };

  function enterRouteMode() {
    originPick.exitOriginPick();
    startRouteMode();
  }

  function goHome() {
    originPick.exitOriginPick();
    exitRouteMode();
    editFlow.close();
    selection.resetForNavigation();
  }

  useEffect(() => {
    const reset = () => {
      editFlow.close();
      resetForNavigation();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) reset();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      reset();
    };
  }, [editFlow.close, resetForNavigation]);

  function handleHouseUpdated(next: PublicHouse) {
    editFlow.setFlow((current) =>
      current?.house.id === next.id ? { ...current, house: next } : current,
    );
    if (admin) {
      applyAdminHouse(next);
      return;
    }
    const code = owned.find((item) => item.id === next.id)?.editCode;
    if (code) {
      saveOwnedHouse({
        id: next.id,
        name: next.name,
        editCode: code,
        preview: next,
      });
    }
    notifyCatalogChanged();
    void refresh(true);
  }

  function requestHouseEdit(house: PublicHouse, allowDelete = false) {
    selection.setEditing(false);
    editFlow.openEdit(house, {
      editCode: admin ? editCodeById.get(house.id) : owned.find((item) => item.id === house.id)?.editCode,
      admin,
      allowDelete: allowDelete || Boolean(admin || owned.some((item) => item.id === house.id)),
    });
  }

  function openOnMap(id: string) {
    selection.showOnMap(id);
    setView("map");
  }

  function handleHouseDeleted(id: string) {
    editFlow.close();
    removeAdminHouse(id);
    removeOwnedHouse(id);
    forgetPublishedHouse(id);
    if (selection.selectedId === id) {
      selection.closeSelection();
    }
    notifyCatalogChanged();
    void refresh(true);
  }

  const selected = selection.selected;
  const mapSheetHouse = selection.selected;

  const mapListObscured = useMemo(
    () =>
      Boolean(
        mapGemHouse ||
          (view === "map" && mapSheetHouse && !originPick.originPickActive) ||
          filtersOpen ||
          routeAlerts.sheetOpen ||
          originPick.originPickerOpen ||
          skipDialogHouse ||
          visitSkipConflict ||
          gemResetHouse ||
          editFlow.flow,
      ),
    [
      mapGemHouse,
      view,
      mapSheetHouse,
      originPick.originPickActive,
      originPick.originPickerOpen,
      filtersOpen,
      routeAlerts.sheetOpen,
      skipDialogHouse,
      visitSkipConflict,
      gemResetHouse,
      editFlow.flow,
    ],
  );

  useLayoutEffect(() => {
    setMapListSuspended(mapListObscured);
  }, [mapListObscured]);

  const selectedFilterReasons = selected
    ? (() => {
        const reasons = houseFilterMismatchReasons(selected, filters, filterContext);
        return reasons.length > 0 ? reasons : undefined;
      })()
    : undefined;

  const gemUi = gemHuntFabVisible(admin, now);
  const houseActionContext = useMemo((): HouseCardActionContext => {
    return {
      admin,
      catalogSource: source,
      liked: likes.liked,
      visited: visits.visited,
      skipped: skips.skipped,
      gemCollected: gemUi ? gems.collected : undefined,
      onToggleLike,
      onToggleVisited,
      onToggleGem: gemUi ? handleToggleGemMenu : undefined,
      onSkip: handleSkipHouse,
      onRestore: handleRestoreHouse,
      onShowOnMap: openOnMap,
      onShowInList: (id) => {
        if (!matchedIds.has(id)) return;
        selection.showInListFromMap(id);
        setView("list");
      },
      canEdit: (id) => Boolean(admin || owned.some((item) => item.id === id)),
      editCodeFor: (id) =>
        admin ? editCodeById.get(id) : owned.find((item) => item.id === id)?.editCode,
      onEdit: (house) => requestHouseEdit(house, true),
      skipMetaFor: (id) => skips.meta(id),
      editingId: editFlow.flow?.house.id ?? null,
    };
  }, [
    admin,
    source,
    likes.liked,
    visits.visited,
    skips,
    gemUi,
    gems.collected,
    onToggleLike,
    onToggleVisited,
    handleToggleGemMenu,
    handleSkipHouse,
    handleRestoreHouse,
    matchedIds,
    owned,
    editCodeById,
    editFlow.flow?.house.id,
    selection.showInListFromMap,
  ]);

  const houseDetailCommon = selected
    ? {
        house: selected,
        actionContext: houseActionContext,
        index: selection.selectedListIndex,
        onClose: selection.closeSelection,
        liked: likes.liked,
        visited: visits.visited,
        gemCollected: gemUi ? gems.collected : undefined,
        clusterOverview: selection.clusterOverview,
        openedFromList: selection.openedFromList,
        clusterHouses: selection.selectedCluster,
        now,
        skippedIds: skips.skipped,
        filteredOutIds: (id: string) => filterDimActive && !matchedIds.has(id),
        onAdjacentClusterHouse: selection.selectAdjacentClusterHouse,
        extra:
          gemUi && gemPanelReady ? (
            <GemHuntPanelLazy house={selected} userLocation={gps} isAdmin={admin} />
          ) : undefined,
      }
    : null;

  return (
    <div
      id="neighborhood-shell"
      className={cn(
        "relative isolate flex flex-col overflow-hidden",
        view === "list" && "is-list-view",
      )}
      style={{ display: "flex", flexDirection: "column", height: "var(--app-h, 100svh)", overflow: "hidden" }}
    >
      <AppHeader onHomeTap={goHome} />
      {!originPick.originPickActive ? (
        <div className="neighborhood-toolbar-top shrink-0">
          <NeighborhoodToolbar
            view={view}
            onViewChange={setView}
            onListView={() => {
              setView("list");
              selection.closeSelection();
            }}
            likedOnly={likedOnly}
            activeFilterCount={activeFilterCount}
            onOpenFilters={() => setFiltersOpen(true)}
            originShifted={originChoice.kind !== "gps"}
            onOpenOriginPicker={() => originPick.setOriginPickerOpen(true)}
            routeMode={routeMode}
            onToggleRoute={() => (routeMode ? exitRouteMode() : enterRouteMode())}
            houses={visible}
            totalInSet={mapHouses.length}
            routeTicker={originPick.routeTicker}
            routeUpdateCount={routeMode ? routeAlerts.changes.length : 0}
            routeUpdateTicker={
              routeMode && routeAlerts.changes.length > 0
                ? routeChangeBannerMessage(routeAlerts.changes, routeAlerts.fromBackground)
                : null
            }
            onOpenRouteUpdates={
              routeMode && routeAlerts.changes.length > 0 ? routeAlerts.openSheet : undefined
            }
            activeRoute={activeRoute}
          />
        </div>
      ) : null}
      <button
        type="button"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-lg focus:bg-orange-500 focus:px-3 focus:py-2 focus:text-black"
        onClick={() => setView("list")}
      >
        דלג לרשימת הבתים
      </button>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selection.selected ? houseSelectionAnnouncement(selection.selected) : ""}
        {routeMode && walkingRoute
          ? ` מסלול עם ${walkingRoute.stops.length} עצירות.`
          : ""}
      </div>
      {filtersOpen ? (
        <FiltersSheet
          open
          onOpenChange={setFiltersOpen}
          activeCount={sheetActiveCount}
          resultCount={sheetResultCount}
          onClear={resetFilterDraft}
          onSave={commitFilterDraft}
          saveDisabled={Boolean(visitWindowInvalid)}
        >
          <HouseFiltersContent
            filters={sheetFilters}
            now={now}
            onPatch={patchFilterDraft}
            showGemFilters={gemHuntFabVisible(admin, now)}
          />
        </FiltersSheet>
      ) : null}
      <NeighborhoodStatusBanners
        outsideBanner={originPick.outsideBanner}
        offline={offline}
        unreachable={unreachable}
        error={error}
        hasCachedHouses={houses.length > 0}
      />
      <TempSkipRestoreAlerts
        alerts={tempRestoreAlerts}
        onFocusHouse={(id) => {
          dismissTempRestoreAlert(id);
          openOnMap(id);
        }}
        onDismiss={dismissTempRestoreAlert}
      />
      {routeMode &&
      routeAlerts.changes.length > 0 &&
      !routeAlerts.bannerDismissed &&
      !routeAlerts.sheetOpen ? (
        <RouteChangeBanner
          changes={routeAlerts.changes}
          fromBackground={routeAlerts.fromBackground}
          onOpen={routeAlerts.openSheet}
          onDismiss={routeAlerts.dismissBanner}
        />
      ) : null}
      {routeAlerts.sheetOpen ? (
        <RouteChangesSheet
          open
          changes={routeAlerts.changes}
          onClose={routeAlerts.closeSheet}
          onFocusHouse={(house) => {
            selection.selectOnMap(house);
            setView("map");
          }}
          actionContext={houseActionContext}
        />
      ) : null}
      <main
        className="relative z-0 min-h-0 flex-1 isolate overflow-hidden"
        style={{ flex: 1, minHeight: 0, position: "relative" }}
      >
        <>
          {view === "map" ? (
            <>
              <div className="map-stage absolute inset-0 z-0 isolate" style={{ position: "absolute", inset: 0 }}>
                <HouseMapDynamic
                  houses={mapHouses}
                  matchedIds={matchedIds}
                  matchedIdsKey={matchedIdsKey}
                  filterDimActive={filterDimActive}
                  selectedId={originPick.originPickActive ? null : selection.selected?.id}
                  clusterOverview={selection.clusterOverview}
                  onSelect={(house, opts) => {
                    if (originPick.originPickActive) return;
                    selection.selectOnMap(house, opts);
                  }}
                  onClose={selection.closeSelection}
                  className="h-full w-full"
                  followSelection={!mapListObscured}
                  userLocation={gps}
                  locating={geo.status === "pending" && askedLocation}
                  onLocate={originPick.goToMyLocation}
                  routeLine={routeMode && !originPick.originPickActive ? routeLine : null}
                  routeStart={routeMode ? origin : null}
                  routeStartedFrom={routeMode && activeRoute ? activeRoute.startedFrom : null}
                  visitedIds={visits.visitedIds}
                  skippedIds={skips.skippedIds}
                  originMarker={origin.fromGps ? null : origin}
                  originPickActive={originPick.originPickActive}
                  originPick={originPick.originDraft}
                  onOriginPick={originPick.onOriginMapPick}
                  panTo={originPick.panTo}
                  panTick={originPick.panTick}
                  statsFab={
                    originPick.originPickActive ? null : (
                      <MapStats {...summaryProps} />
                    )
                  }
                  routeStops={
                    routeMode && activeRoute && !originPick.originPickActive
                      ? activeRoute.stops.map((stop) => ({
                          id: stop.house.id,
                          order: stop.order,
                          lat: stop.house.lat,
                          lng: stop.house.lng,
                        }))
                      : null
                  }
                  gemHuntEnabled={gemHuntActive}
                  showGemAnchors={gemUi}
                  gemAnchorHouses={gemUi ? mapHouses : []}
                  isGemCollected={gems.collected}
                  onGemHuntPress={() => void openMapGemHunt()}
                  gemGlow="off"
                  gemAllCollected={gemAllCollected}
                  gemCollectedCount={mapGemBadgeCount}
                />
                {gemHuntActive && gemAllCollected && !originPick.originPickActive ? (
                  <GemMapCompleteBanner />
                ) : null}
                {originPick.originPickActive ? (
                  <div className="origin-pick-bar">
                    <p className="origin-pick-label">{originPick.originDraftLabel}</p>
                    <div className="origin-pick-actions">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-orange-500 text-black hover:bg-orange-400"
                        disabled={!originPick.originDraft}
                        onClick={() => void originPick.saveOriginPick()}
                      >
                        שמירת התחלה
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={originPick.exitOriginPick}>
                        ביטול
                      </Button>
                    </div>
                  </div>
                ) : null}
                <CatalogMetaChip
                  hidden={Boolean(selection.selected) && !originPick.originPickActive}
                  houseSetLabel={admin ? HOUSE_SET_LABELS[activeHouseSet] : null}
                />
              </div>
              {mapSheetHouse && houseDetailCommon && !originPick.originPickActive ? (
                <div className="map-sheet-host" aria-hidden={false}>
                  <MapHouseSheet
                    {...houseDetailCommon}
                    onRestoreRoute={
                      skips.skipped(mapSheetHouse.id)
                        ? () => handleRestoreHouse(mapSheetHouse.id)
                        : undefined
                    }
                    filterMismatchReasons={selectedFilterReasons}
                    skipMeta={
                      skips.skipped(mapSheetHouse.id) ? skips.meta(mapSheetHouse.id) : undefined
                    }
                    onSelectClusterHouse={(id) => {
                      const house =
                        selection.selectedCluster.find((item) => item.id === id) ??
                        houses.find((item) => item.id === id);
                      if (house) selection.selectOnMap(house);
                    }}
                    onBackToClusterOverview={selection.backToClusterOverview}
                    hideHoursBanner={
                      routeMode &&
                      (visits.visited(mapSheetHouse.id) || skips.skipped(mapSheetHouse.id))
                    }
                  />
                </div>
              ) : null}
            </>
          ) : (
            <div
              id="house-list-skip"
              className="absolute inset-0 z-10 overflow-y-auto bg-[#12081a]"
              style={{ position: "absolute", inset: 0, overflowY: "auto", background: "#12081a" }}
              role="region"
              aria-label="רשימת בתים"
            >
              <div className="mx-auto w-full min-w-0 max-w-3xl px-3 pt-3">
                {routeMode ? (
                  <div className="min-w-0 rounded-3xl bg-[#160b20] p-2 ring-1 ring-orange-500/40">
                    <StatsSummary {...summaryProps} compact />
                  </div>
                ) : null}
              </div>
              {mapListObscured ? (
                <div
                  className="min-h-[40vh] w-full bg-[#12081a]"
                  aria-hidden
                />
              ) : routeMode ? (
                <RouteList
                  items={routeListItems}
                  actionContext={houseActionContext}
                  originLabel={activeRoute?.originLabel}
                  startedFrom={activeRoute?.startedFrom}
                  hasGps={Boolean(gps)}
                  onRequestLocation={gpsAllowed ? originPick.chooseGpsOrigin : undefined}
                  onChangeOrigin={() => originPick.setOriginPickerOpen(true)}
                  focusId={selection.listFocusId}
                />
              ) : (
                <HouseList
                  houses={visible}
                  origin={origin}
                  now={now}
                  actionContext={houseActionContext}
                  focusId={selection.listFocusId}
                />
              )}
            </div>
          )}
          {showBootstrapSpinner ? (
            <div
              className="absolute inset-0 z-30 flex items-center justify-center bg-[#12081a] text-orange-200"
              aria-live="polite"
            >
              מדליקים דלעות…
            </div>
          ) : null}
        </>
      </main>
      <EventCountdownGate />
      {originPick.originPickerOpen ? (
        <OriginPickerSheet
          open
          onOpenChange={originPick.setOriginPickerOpen}
          choice={originChoice}
          gpsAllowed={gpsAllowed}
          onChooseGps={originPick.chooseGpsOrigin}
          onChooseNeighborhood={originPick.chooseNeighborhoodOrigin}
          onChooseCustom={originPick.chooseCustomOrigin}
          onPickOnMap={originPick.startOriginPick}
        />
      ) : null}
      {routeSharePrompt ? (
        <RouteShareImportDialog
          open
          stopCount={routeSharePrompt.stopIds.length}
          onAccept={acceptSharedRoute}
          onDecline={declineSharedRoute}
        />
      ) : null}
      {skipDialogHouse ? (
        <SkipHouseDialog
          open
          house={skipDialogHouse}
          filters={filters}
          now={now}
          existingMeta={skips.meta(skipDialogHouse.id)}
          onConfirm={confirmSkipHouse}
          onUnskip={skips.skipped(skipDialogHouse.id) ? unskipFromDialog : undefined}
          onCancel={() => setSkipDialogHouse(null)}
        />
      ) : null}
      {visitSkipConflict ? (
        <VisitSkipConflictDialog
          open
          kind={visitSkipConflict.kind}
          house={visitSkipConflict.house}
          onConfirm={confirmVisitSkipConflict}
          onCancel={() => setVisitSkipConflict(null)}
        />
      ) : null}
      <VisitCheer show={visitCheer} />
      <RouteCompleteCheer show={routeCompleteCheer} />
      <LikeCheer show={likeCheer} />
      <HouseEditFlowPanels
        flow={editFlow.flow}
        setFlow={editFlow.setFlow}
        onClose={editFlow.close}
        onUpdated={handleHouseUpdated}
        onDeleted={handleHouseDeleted}
      />
      {gemResetHouse ? (
        <GemResetConfirmDialog
          open
          house={gemResetHouse}
          onConfirm={confirmGemReset}
          onCancel={() => setGemResetHouse(null)}
        />
      ) : null}
      {mapGemHouse ? (
        <GemHuntOverlayLazy
          house={mapGemHouse}
          userLocation={gps}
          deferCameraUntilInRange={false}
          collectEnabled={canCollectGem(
            gps,
            mapGemHouse,
            gems.collected(mapGemHouse.id),
            mapGemStanding.ready,
            false,
          )}
          onClose={() => {
            stopGemHuntCameraStream();
            setMapGemHouse(null);
          }}
          onCollect={(monsterId) => {
            const h = mapGemHouse;
            gems.collect(h.id, monsterId);
            stopGemHuntCameraStream();
            setMapGemHouse(null);
            celebrateGemCollect();
          }}
        />
      ) : null}
    </div>
  );
}
