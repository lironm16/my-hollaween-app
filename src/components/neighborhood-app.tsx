"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { flushSync } from "react-dom";
import { AppHeader } from "@/components/app-header";
import { useHomeUrlParams } from "@/hooks/use-home-url-params";
import { CatalogMetaChip } from "@/components/catalog-meta-chip";
import { FiltersSheet } from "@/components/filter-menu";
import { HouseFiltersContent } from "@/components/house-filters-content";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { invalidateMapPinIconCacheForGemRings } from "@/lib/map-pin-icon-cache";
import { HouseList } from "@/components/house-list";
import type { HouseCardActionContext } from "@/components/house-card-actions";
import { useGemAnchorPlacer } from "@/components/gem-anchor-place-dialog";
import { MapStats, StatsSummary } from "@/components/map-stats";
import { MapHouseSheet } from "@/components/map-house-sheet";
import { HouseEditFlowPanels, useHouseEditFlow } from "@/components/house-edit-flow";
import { NeighborhoodStatusBanners } from "@/components/neighborhood-status-banners";
import { NightPassBanner } from "@/components/night-pass-banner";
import { useNightPassDialog } from "@/components/night-pass-dialog-provider";
import { useNightPass } from "@/hooks/use-night-pass";
import { adminSeesAllHouses } from "@/lib/night-pass-client";
import { RouteChangeBanner, routeChangeBannerMessage } from "@/components/route-change-banner";
import { RouteChangesSheet } from "@/components/route-changes-sheet";
import { EventCountdownGate } from "@/components/event-countdown-gate";
import { NeighborhoodToolbar } from "@/components/neighborhood-toolbar";
import { RouteShareImportDialog } from "@/components/route-share-import-dialog";
import { OriginPickerSheet } from "@/components/origin-picker";
import { RouteList } from "@/components/route-list";
import { buildRouteListItems } from "@/lib/route-list-items";
import { routeDisplayOrder } from "@/lib/route-display-order";
import { VisitSkipConflictDialog } from "@/components/visit-skip-conflict-dialog";
import { LikeCheer } from "@/components/like-cheer";
import { RouteCompleteCheer } from "@/components/route-complete-cheer";
import { VisitCheer } from "@/components/visit-cheer";
import { GemCheer } from "@/components/gem-cheer";
import {
  GemClusterSessionSummary,
  type GemClusterSessionCatch,
} from "@/components/gem-cluster-session-summary";
import { GemResetConfirmDialog } from "@/components/gem-reset-confirm-dialog";
import {
  GemHuntExperienceLazy,
  preloadGemHuntChunks,
} from "@/components/gem-hunt/gem-hunt-lazy";
import { useGemHuntAdminUi } from "@/hooks/use-gem-admin-ui";
import {
  isAndroidLike,
  isIosLike,
  supportsWebXrHitTestAr,
  webXrHitTestArCached,
} from "@/lib/gem-hunt-ar-platform";
import { getGemHuntPortalRoot } from "@/lib/gem-hunt-portal-root";
import { endGemHuntWebXrSession, requestGemHuntWebXrSession } from "@/lib/gem-hunt-webxr-session";
import { useGemProgress } from "@/hooks/use-gem-progress";
import { gemBagCelebrateAfterCollect, gemBagCollectHref } from "@/lib/gem-bag-celebrate";
import { isGemTypeInCollection, loadGemCollected, loadGemCollectedIds } from "@/lib/gem-progress";
import { canCollectGem, userWithinGemHuntRange, GEM_CHEER_MS } from "@/lib/gem-hunt";
import { mapGemNearSignalActive } from "@/lib/map-gem-near-signal";
import {
  firstClusterGemHouseToHunt,
  gemClusterQueueHeadline,
  nextClusterGemHouse,
  skipClusterGemHouse,
} from "@/lib/gem-campus-queue";
import {
  firstClusterGemHouseInProximity,
  pickMapFabGemHuntTarget,
  pickMapRovingGemHuntHouse,
} from "@/lib/map-gem-hunt-target";
import { gemTellMeHuntRadiusEnforced } from "@/lib/gem-tell-me-gate";
import type { GemMonsterId } from "@/lib/gem-monsters";
import {
  gemCapableMapHouses,
  houseGemHuntUiEligible,
  mainMapGemEligibleHouses,
  syncGemMonsterAssignment,
} from "@/lib/gem-monsters";
import {
  isGemHuntOrientationGranted,
  prepareGemHuntSensors,
  releaseGemHuntCamera,
  stopGemHuntCameraStream,
} from "@/lib/gem-hunt-sensors";
import { useRouteGeometry } from "@/hooks/use-route-geometry";
import { Button } from "@/components/ui/button";
import { useAddressReveal } from "@/hooks/use-address-reveal";
import { housesWithLocationPolicy } from "@/lib/address-reveal";
import { adminDeviceOwnerPowers, adminShowsPrivateHouseFields } from "@/lib/admin-preview-as-user";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useAdminHouses } from "@/hooks/use-admin-houses";
import { useFilterDraft } from "@/hooks/use-filter-draft";
import { useHouseActions } from "@/hooks/use-house-actions";
import { useHouseFilters, countActiveFilters } from "@/hooks/use-house-filters";
import { useHouseSelection } from "@/hooks/use-house-selection";
import { AdminHouseFieldsProvider } from "@/hooks/use-admin-house-fields";
import { isCatalogRemoved } from "@/lib/catalog-removed";
import {
  enrichHousesForUserPreview,
  enrichHousesWithAdminLocations,
  useMergedHouses,
} from "@/hooks/use-merged-houses";
import { useNeighborhoodRoute } from "@/hooks/use-neighborhood-route";
import { useOriginPick } from "@/hooks/use-origin-pick";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { useUserLocation, type UserLocation } from "@/hooks/use-user-location";
import { useVisitedHouses } from "@/hooks/use-visited-houses";
import { useSkippedHouses } from "@/hooks/use-skipped-houses";
import { useDistanceOrigin } from "@/hooks/use-distance-origin";
import { useHouseSet } from "@/hooks/use-house-set";
import { useMapListUiLock } from "@/hooks/use-map-list-ui-lock";
import { setMapListSuspended } from "@/lib/map-list-suspend";
import { applyClockSearchParams } from "@/lib/app-clock";
import { useAppNow } from "@/hooks/use-app-clock";
import {
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
import { isAuthoritativeHouseList, resolveCatalogHouses } from "@/lib/catalog-houses";
import {
  catalogHasRealHouses,
  resolveViewerHouseSet,
  countSkippedInSet,
  countVisitedInSet,
  countLikedInSet,
  houseMatchesSet,
} from "@/lib/house-set";
import {
  houseVisibleOnMainMap,
  formatMapDisplayLayersStatus,
  mapDisplayLayersForSession,
} from "@/lib/map-display-layers";
import { stripPracticeHouses } from "@/lib/practice-house";
import { isPreviewDeploymentClient } from "@/lib/deployment-env";
import { filterHouses, houseFilterMismatchReasons } from "@/lib/filter-houses";
import { formatDistance } from "@/lib/geo";
import { geoCanPromptLocation, geoLocationHintHe } from "@/lib/geo-location-access";
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
import { useRouteStatusAlerts } from "@/hooks/use-route-status-alerts";
import {
  primaryRestoreTriggerFromSnapshot,
  skipStatusSnapshot,
  type SkipReasonId,
} from "@/lib/skip-reasons";
import { useSkipRestoreUndoPrompt } from "@/hooks/use-skip-restore-undo-prompt";
import { SkipRestoreUndoDialog } from "@/components/skip-restore-undo-dialog";
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
  focusId: focusIdFromServer = null,
  routeShareParam: routeShareParamFromServer = null,
  gemHuntFromUrl: gemHuntFromServer = false,
  visitFromUrl: visitFromServer = false,
}: {
  initialCatalog?: Catalog | null;
  focusId?: string | null;
  routeShareParam?: string | null;
  gemHuntFromUrl?: boolean;
  visitFromUrl?: boolean;
}) {
  const { focusId, routeShareParam, gemHuntFromUrl, visitFromUrl } = useHomeUrlParams({
    focusId: focusIdFromServer,
    routeShareParam: routeShareParamFromServer,
    gemHuntFromUrl: gemHuntFromServer,
    visitFromUrl: visitFromServer,
  });
  const { catalog, loading, ready: catalogReady, offline, unreachable, error, source, refresh } =
    useCatalog(initialCatalog);
  const catalogUpdatedAt = catalog?.updatedAt;
  const { admin, ready: adminSessionReady } = useAdminSession();
  const now = useAppNow();
  const addressReveal = useAddressReveal();
  const distanceLabel = useCallback(
    (houseId: string, meters: number) =>
      addressReveal.distanceAllowed(houseId) ? formatDistance(meters) : "",
    [addressReveal],
  );
  const {
    gemHuntVisible: gemFeatureOn,
    gemUiVisible: gemUi,
    gemAdminToolsVisible: gemAdminTools,
    previewAsUser: gemPreviewAsUser,
  } = useGemHuntAdminUi(admin);
  const gemHuntActive = gemFeatureOn && gemUi;
  useEffect(() => {
    if (!gemHuntActive || !isAndroidLike()) return;
    void supportsWebXrHitTestAr();
  }, [gemHuntActive]);
  const geo = useUserLocation({ watch: false });
  const { setWatchEnabled } = geo;
  const gps = geo.location;
  const gems = useGemProgress();
  const [mapGemHouse, setMapGemHouse] = useState<PublicHouse | null>(null);
  /** Sorted cluster houses when gem camera runs as one multi-unit session. */
  const [mapGemClusterMembers, setMapGemClusterMembers] = useState<PublicHouse[] | null>(null);
  const [mapGemGps, setMapGemGps] = useState<UserLocation | null>(null);
  const [mapGemWebXrSession, setMapGemWebXrSession] = useState<XRSession | null>(null);
  const gemBadgePendingRef = useRef(false);
  const mapGemOpenGenRef = useRef(0);
  const [, setMapGemBadgeCount] = useState(() =>
    typeof window === "undefined" ? 0 : loadGemCollectedIds().length,
  );
  /** Toolbar toggle — diamonds hidden on map until user taps the top-bar gem control. */
  const [mapDiamondsVisible, setMapDiamondsVisible] = useState(false);
  useEffect(() => {
    invalidateMapPinIconCacheForGemRings();
  }, [mapDiamondsVisible]);
  const showGemMapLegend = gemFeatureOn;
  const [gemResetHouse, setGemResetHouse] = useState<PublicHouse | null>(null);
  const [gemResetCluster, setGemResetCluster] = useState<PublicHouse[] | null>(null);
  const [mapGemCheerHouse, setMapGemCheerHouse] = useState<PublicHouse | null>(null);
  const [mapGemCheerMonster, setMapGemCheerMonster] = useState<GemMonsterId | null>(null);
  const mapGemCheerTimerRef = useRef<number | null>(null);
  const mapGemClusterSessionRef = useRef<GemClusterSessionCatch[]>([]);
  /** Sticky tell-me / hint target until the user taps «גלה לי» or «רמז» again. */
  const mapGemNavPinRef = useRef<string | null>(null);
  const [clusterGemSessionSummary, setClusterGemSessionSummary] = useState<
    GemClusterSessionCatch[] | null
  >(null);
  const [mapGemClusterCatchCount, setMapGemClusterCatchCount] = useState(0);
  const gemHuntOpenedFromViewRef = useRef<HomeView>("map");
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const savedListScrollTopRef = useRef(0);
  const router = useRouter();
  const gpsAllowed = geoCanPromptLocation(geo.status);

  useEffect(() => {
    if (!gemHuntActive || !mapGemHouse) return;
    setWatchEnabled(true);
    void geo.refresh();
  }, [gemHuntActive, mapGemHouse, geo.refresh, setWatchEnabled]);

  const { choice: originChoice, resolved: origin, setChoice: setOriginChoice } = useDistanceOrigin(gps);
  const { layers, houseSet: legacyHouseSetFromLayers } = useHouseSet();
  const houseSet = legacyHouseSetFromLayers;
  const adminForHouseSet = adminSessionReady && admin;
  const previewDeployment = isPreviewDeploymentClient();
  const activeHouseSet = resolveViewerHouseSet(catalog, adminForHouseSet, houseSet, {
    previewDeployment,
  });
  const mapLayers = useMemo(
    () =>
      mapDisplayLayersForSession(layers, {
        previewDeployment,
        activeHouseSet,
        catalog,
      }),
    [layers, previewDeployment, activeHouseSet, catalog],
  );
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
  const { accessibleOnly } = filters;

  const [askedLocation, setAskedLocation] = useState(false);
  const [visitSkipConflict, setVisitSkipConflict] = useState<{
    kind: "visit" | "skip" | "visit-all" | "skip-all";
    house: PublicHouse;
    cluster?: boolean;
    clusterHouses?: PublicHouse[];
  } | null>(null);
  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const skips = useSkippedHouses();
  const owned = useOwnedHouses();
  const nightPass = useNightPass();
  const { open: openGemPlacer, dialog: gemPlacerDialog } = useGemAnchorPlacer({
    userLocation: gps,
    refreshLocation: geo.refresh,
  });
  const { openOwnerPasses } = useNightPassDialog();
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
  const restoreRedactedLocations = adminShowsPrivateHouseFields(adminForHouseSet, gemPreviewAsUser);
  const houses = useMergedHouses({
    catalogHouses,
    owned,
    admin: adminSeesAllHouses(adminForHouseSet, nightPass),
    adminHouses,
    includeCatalogWhenAdmin: true,
    restoreRedactedLocations,
  });
  /** Removed-from-catalog rows stay on «במכשיר שלי» only — inject for ?focus= from that tab. */
  const housesForMap = useMemo(() => {
    if (!focusId || adminForHouseSet || houses.some((house) => house.id === focusId)) {
      return houses;
    }
    if (!isCatalogRemoved(focusId)) return houses;
    const preview = owned.find((item) => item.id === focusId)?.preview;
    return preview ? [...houses, preview] : houses;
  }, [houses, focusId, owned, adminForHouseSet]);
  const lastHousesRef = useRef<PublicHouse[]>([]);
  const displayHouses = useMemo(() => {
    const applyVisitorLocations = (list: PublicHouse[]) =>
      gemPreviewAsUser ? housesWithLocationPolicy(list, addressReveal) : list;
    const applyAdminLocations = (list: PublicHouse[]) => {
      if (restoreRedactedLocations) {
        return enrichHousesWithAdminLocations(list, adminHouses, true);
      }
      if (gemPreviewAsUser) {
        return enrichHousesForUserPreview(list, adminHouses, addressReveal);
      }
      return list;
    };

    if (housesForMap.length > 0) {
      const next = applyVisitorLocations(applyAdminLocations(housesForMap));
      lastHousesRef.current = next;
      return next;
    }
    const authHouses =
      catalog && isAuthoritativeHouseList(catalog) && catalog.houses.length > 0
        ? catalog.houses
        : null;
    if (authHouses) {
      const next = applyVisitorLocations(applyAdminLocations(authHouses));
      lastHousesRef.current = next;
      return next;
    }
    if (lastHousesRef.current.length > 0) return lastHousesRef.current;
    return housesForMap;
  }, [housesForMap, catalog, gemPreviewAsUser, addressReveal, adminHouses, restoreRedactedLocations]);

  const housesForMapAndList = useMemo(
    () => stripPracticeHouses(displayHouses),
    [displayHouses],
  );

  const { houses: mapListHouses, now: mapListNow } = useMapListUiLock(housesForMapAndList, now);

  const housesForFilters = useMemo(() => stripPracticeHouses(mapListHouses), [mapListHouses]);

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
    () =>
      mapListHouses.filter((house) => houseVisibleOnMainMap(house, mapLayers)),
    [mapListHouses, mapLayers],
  );
  const gemCapableHouses = useMemo(
    () => gemCapableMapHouses(mapHouses, activeHouseSet),
    [mapHouses, activeHouseSet],
  );
  const gemAssignmentSyncHouses = useMemo(
    () => gemCapableMapHouses(mapListHouses, activeHouseSet),
    [mapListHouses, activeHouseSet],
  );
  const gemMapRingHouses = useMemo(
    () => mainMapGemEligibleHouses(mapHouses, activeHouseSet, addressReveal),
    [mapHouses, activeHouseSet, addressReveal],
  );
  useEffect(() => {
    if (catalogReady && gemAssignmentSyncHouses.length > 0) {
      syncGemMonsterAssignment(gemAssignmentSyncHouses);
    }
  }, [catalogReady, gemAssignmentSyncHouses]);
  const visible = useMemo(
    () => filterHouses(housesForFilters, filters, filterContext),
    [housesForFilters, filters, filterContext],
  );
  /** Avoid SSR/client mismatch: device cache loads after hydration in CatalogProvider. */
  const visibleForList = catalogReady ? visible : [];
  const showBootstrapSpinner =
    displayHouses.length === 0 && !catalogHasRealHouses(catalog) && loading && !catalogReady;
  const matchedIds = useMemo(() => new Set(visible.map((house) => house.id)), [visible]);
  const filterDimActive = matchedIds.size < mapHouses.length;
  const gemMapRingHousesVisible = useMemo(
    () => gemMapRingHouses.filter((house) => matchedIds.has(house.id)),
    [gemMapRingHouses, matchedIds],
  );
  const mapGemNearSignal = useMemo(
    () =>
      gemUi
        ? mapGemNearSignalActive(gps, gemMapRingHousesVisible, matchedIds, gems.collected)
        : false,
    [gemUi, gps, gemMapRingHousesVisible, matchedIds, gems.collected],
  );
  const matchedIdsKey = useMemo(
    () => (filterDimActive ? visible.map((house) => house.id).join("\0") : ""),
    [filterDimActive, visible],
  );
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const selection = useHouseSelection({ focusId, visible, houses: mapListHouses, clusterHouses: mapHouses });
  const { resetForNavigation } = selection;

  const bootMapGemHunt = useCallback(
    async (house: PublicHouse, clusterMembers: PublicHouse[] | null) => {
      const gen = ++mapGemOpenGenRef.current;
      preloadGemHuntChunks();
      getGemHuntPortalRoot();
      const openedFrom = readHomeView();
      gemHuntOpenedFromViewRef.current = openedFrom;
      if (openedFrom === "map" && !clusterMembers) {
        setView("map");
        selection.selectOnMap(house);
      } else if (openedFrom === "map" && clusterMembers) {
        setView("map");
      }
      setWatchEnabled(true);
      setMapGemWebXrSession(null);
      setMapGemGps(gps);
      setMapGemClusterMembers(clusterMembers);
      flushSync(() => {
        setMapGemHouse(house);
      });

      let xrSession: XRSession | null = null;
      if (isAndroidLike() && webXrHitTestArCached()) {
        xrSession = await requestGemHuntWebXrSession();
      }
      if (gen !== mapGemOpenGenRef.current) {
        void endGemHuntWebXrSession(xrSession);
        releaseGemHuntCamera();
        return;
      }
      setMapGemWebXrSession(xrSession);

      await prepareGemHuntSensors({
        requestCamera: !xrSession,
        requestOrientation: !isGemHuntOrientationGranted(),
      });
      if (gen !== mapGemOpenGenRef.current) {
        void endGemHuntWebXrSession(xrSession);
        releaseGemHuntCamera();
        return;
      }

      void (async () => {
        const freshGps = (await geo.refresh()) ?? gps;
        if (gen === mapGemOpenGenRef.current) {
          setMapGemGps(freshGps);
        }
      })();
    },
    [geo, gps, selection, setWatchEnabled],
  );

  const gemHouseHuntAllowed = useCallback(
    (house: PublicHouse) => houseGemHuntUiEligible(house, activeHouseSet, addressReveal),
    [activeHouseSet, addressReveal],
  );

  const fabGemHuntPool = useMemo(
    () =>
      gemMapRingHousesVisible.filter(
        (h) => matchedIds.has(h.id) && gemHouseHuntAllowed(h) && !gems.collected(h.id),
      ),
    [gemMapRingHousesVisible, matchedIds, gemHouseHuntAllowed, gems.collected],
  );

  const openGemHuntForHouse = useCallback(
    async (house: PublicHouse) => {
      if (gems.collected(house.id)) return;
      if (!gemHouseHuntAllowed(house)) return;
      mapGemClusterSessionRef.current = [];
      setMapGemClusterCatchCount(0);
      await bootMapGemHunt(house, null);
    },
    [bootMapGemHunt, gemHouseHuntAllowed, gems],
  );

  const openGemHuntForCluster = useCallback(
    async (clusterHouses: PublicHouse[]) => {
      const houses = clusterHouses.filter(gemHouseHuntAllowed);
      if (houses.length < 2) return;
      const target =
        firstClusterGemHouseInProximity(houses, gps, gems.collected) ??
        firstClusterGemHouseToHunt(houses, gems.collected);
      if (!target) return;
      mapGemClusterSessionRef.current = [];
      setMapGemClusterCatchCount(0);
      await bootMapGemHunt(target, houses);
    },
    [bootMapGemHunt, gemHouseHuntAllowed, gems.collected, gps],
  );

  const pinMapGemNavigationTarget = useCallback(() => {
    const picked = pickMapFabGemHuntTarget(
      gps ?? mapGemGps,
      fabGemHuntPool,
      mapHouses,
      gems.collected,
    );
    if (!picked) return;
    mapGemNavPinRef.current = picked.id;
    setMapGemHouse((current) => (current?.id === picked.id ? current : picked));
  }, [gps, mapGemGps, fabGemHuntPool, mapHouses, gems.collected]);

  const restoreAfterGemHunt = useCallback(() => {
    if (gemHuntOpenedFromViewRef.current !== "list") return;
    setView("list");
    selection.closeSelection();
  }, [selection]);

  const closeMapGemHunt = useCallback(() => {
    mapGemOpenGenRef.current += 1;
    mapGemNavPinRef.current = null;
    releaseGemHuntCamera();
    stopGemHuntCameraStream();
    void endGemHuntWebXrSession(mapGemWebXrSession);
    setMapGemWebXrSession(null);
    setMapGemHouse(null);
    setMapGemClusterMembers(null);
    setMapGemGps(null);
    setMapGemClusterCatchCount(0);
    restoreAfterGemHunt();
  }, [mapGemWebXrSession, restoreAfterGemHunt]);

  const openGemHuntFromMapFab = useCallback(async () => {
    if (mapGemHouse) {
      closeMapGemHunt();
      return;
    }
    if (fabGemHuntPool.length === 0) return;
    mapGemNavPinRef.current = null;
    const target = pickMapFabGemHuntTarget(gps, fabGemHuntPool, mapHouses, gems.collected);
    if (!target) return;
    mapGemClusterSessionRef.current = [];
    await bootMapGemHunt(target, null);
  }, [mapGemHouse, fabGemHuntPool, gps, mapHouses, gems.collected, bootMapGemHunt, closeMapGemHunt]);

  useEffect(() => {
    if (!mapGemHouse || mapGemClusterMembers) return;
    const user = gps ?? mapGemGps;
    if (!user) return;
    const next = pickMapRovingGemHuntHouse(
      user,
      fabGemHuntPool,
      mapHouses,
      gems.collected,
      mapGemNavPinRef.current,
      mapGemHouse.id,
    );
    if (next && next.id !== mapGemHouse.id) {
      setMapGemHouse(next);
    }
  }, [
    mapGemHouse,
    mapGemClusterMembers,
    gps,
    mapGemGps,
    fabGemHuntPool,
    mapHouses,
    gems.collected,
  ]);

  const mapGemClusterQueueUi = useMemo(() => {
    if (!mapGemHouse || !mapGemClusterMembers) return undefined;
    return gemClusterQueueHeadline(mapGemHouse, mapGemClusterMembers);
  }, [mapGemHouse, mapGemClusterMembers]);

  const mapGemClusterSkipAvailable = useMemo(() => {
    if (!mapGemClusterMembers || !mapGemHouse) return false;
    return mapGemClusterMembers.some(
      (h) => h.id !== mapGemHouse.id && !gems.collected(h.id),
    );
  }, [mapGemClusterMembers, mapGemHouse, gems.collectedIds]);

  useEffect(() => {
    if (!gemBadgePendingRef.current) {
      setMapGemBadgeCount(gems.collectedIds.length);
    }
  }, [gems.collectedIds.length]);

  const celebrateGemCollect = useCallback(() => {
    setMapGemBadgeCount(loadGemCollectedIds().length);
  }, []);

  const showMapGemCheer = useCallback((house: PublicHouse, monsterId: GemMonsterId) => {
    setMapGemCheerHouse(house);
    setMapGemCheerMonster(monsterId);
    if (mapGemCheerTimerRef.current != null) window.clearTimeout(mapGemCheerTimerRef.current);
    mapGemCheerTimerRef.current = window.setTimeout(() => {
      mapGemCheerTimerRef.current = null;
      setMapGemCheerHouse(null);
      setMapGemCheerMonster(null);
    }, GEM_CHEER_MS);
  }, []);

  const finishMapGemClusterSession = useCallback(() => {
    const session = [...mapGemClusterSessionRef.current];
    mapGemClusterSessionRef.current = [];
    const members = mapGemClusterMembers;
    closeMapGemHunt();
    if (session.length > 0 && members && members.length >= 2) {
      setClusterGemSessionSummary(session);
    } else if (session.length === 1) {
      showMapGemCheer(session[0]!.house, session[0]!.monsterId);
    }
  }, [closeMapGemHunt, mapGemClusterMembers, showMapGemCheer]);

  const skipMapGemClusterHouse = useCallback(() => {
    if (!mapGemClusterMembers || !mapGemHouse) return;
    const next = skipClusterGemHouse(mapGemClusterMembers, gems.collected, mapGemHouse.id);
    if (next) setMapGemHouse(next);
    else finishMapGemClusterSession();
  }, [finishMapGemClusterSession, gems.collected, mapGemClusterMembers, mapGemHouse]);

  useEffect(() => {
    return () => {
      if (mapGemCheerTimerRef.current != null) window.clearTimeout(mapGemCheerTimerRef.current);
    };
  }, []);

  const handleToggleGemMenu = useCallback(
    (house: PublicHouse) => {
      if (gems.collected(house.id)) {
        setGemResetCluster(null);
        setGemResetHouse(house);
        return;
      }
      if (!gemHouseHuntAllowed(house)) return;
      void openGemHuntForHouse(house);
    },
    [gemHouseHuntAllowed, gems, openGemHuntForHouse],
  );

  const gemHuntFromUrlHandledRef = useRef(false);
  useEffect(() => {
    if (!gemHuntFromUrl || !focusId || gemHuntFromUrlHandledRef.current) return;
    const house = houses.find((item) => item.id === focusId);
    if (!house) return;
    gemHuntFromUrlHandledRef.current = true;
    setView("map");
    selection.selectOnMap(house);
    const timer = window.setTimeout(() => {
      if (gemHouseHuntAllowed(house)) handleToggleGemMenu(house);
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      url.searchParams.delete("gemHunt");
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState(window.history.state, "", next);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [gemHuntFromUrl, focusId, gemHouseHuntAllowed, houses, handleToggleGemMenu, selection]);

  const handleClusterResetAllGems = useCallback((clusterHouses: PublicHouse[]) => {
    const houses = clusterHouses.filter(gemHouseHuntAllowed);
    if (houses.length < 2) return;
    if (!houses.every((h) => gems.collected(h.id))) return;
    setGemResetHouse(null);
    setGemResetCluster(houses);
  }, [gemHouseHuntAllowed, gems]);

  const cancelGemReset = useCallback(() => {
    setGemResetHouse(null);
    setGemResetCluster(null);
  }, []);

  const confirmGemReset = useCallback(() => {
    const cluster = gemResetCluster;
    if (cluster && cluster.length >= 2) {
      for (const h of cluster) gems.resetHouse(h.id);
      gemBadgePendingRef.current = false;
      setMapGemBadgeCount(loadGemCollectedIds().length);
      setGemResetCluster(null);
      return;
    }
    const house = gemResetHouse;
    if (!house) return;
    gems.resetHouse(house.id);
    gemBadgePendingRef.current = false;
    setGemResetHouse(null);
  }, [gemResetCluster, gemResetHouse, gems]);
  const editFlow = useHouseEditFlow();

  const {
    routeMode,
    pinnedRoute,
    setPinnedRoute,
    filterRoute,
    pinCurrentRoute,
    enterRouteMode: startRouteMode,
    exitRouteMode,
    pendingRouteGps,
    clearPendingRouteGps,
    routeSessionDisplayOrders,
    routeSessionPlan,
    commitSessionPlan,
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
    commitSessionPlan,
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
    clearPendingRouteGps,
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
  const routePlan = routeMode ? (routeSessionPlan ?? activeRoute) : null;

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
      commitSessionPlan(route);
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
    commitSessionPlan,
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
      const plan = routeSessionPlan ?? walkingRoute;
      if (!plan) return "visit";
      return isRouteFullyVisited(plan, skips.skippedIds, nextVisitedIds)
        ? "route-complete"
        : "visit";
    },
    [routeMode, walkingRoute, routeSessionPlan, skips.skippedIds],
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
      void nextVisitedIds;
      void nextSkippedIds;
      /* Route tour geometry stays on session plan — progress is segment/list coloring only. */
    },
    [celebrateVisit, selection.clearListFocus, skips, visits],
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

  const visitFromUrlHandledRef = useRef<string | null>(null);
  const visitFromUrlLatestRef = useRef({ onToggleVisited, visited: visits.visited });
  visitFromUrlLatestRef.current = { onToggleVisited, visited: visits.visited };
  useEffect(() => {
    if (!visitFromUrl || !focusId) {
      if (!visitFromUrl) visitFromUrlHandledRef.current = null;
      return;
    }
    if (visitFromUrlHandledRef.current === focusId) return;
    const house = mapListHouses.find((item) => item.id === focusId) ?? houses.find((item) => item.id === focusId);
    if (!house) return;
    visitFromUrlHandledRef.current = focusId;
    setView("map");
    selection.selectOnMap(house);
    // Not cleared on re-render: selecting the house changes deps, and the visit must still land.
    window.setTimeout(() => {
      const latest = visitFromUrlLatestRef.current;
      if (!latest.visited(focusId)) latest.onToggleVisited(focusId);
      const url = new URL(window.location.href);
      url.searchParams.delete("visit");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }, 200);
  }, [visitFromUrl, focusId, houses, mapListHouses, selection]);

  const routeListItems = useMemo(() => {
    if (!routeMode || !routePlan) return [];
    return buildRouteListItems({
      route: routePlan,
      catalogHouses: mapListHouses,
      houseSet: activeHouseSet,
      visitedIds: visits.visitedIds,
      skippedIds: skips.skippedIds,
      origin: { lat: origin.lat, lng: origin.lng },
      distanceLabel,
      distanceAllowed: addressReveal.distanceAllowed,
      sessionDisplayOrders: routeSessionDisplayOrders,
      routeModeActive: true,
    });
  }, [
    routeMode,
    routePlan,
    skips.skippedIds,
    visits.visitedIds,
    mapListHouses,
    activeHouseSet,
    origin.lat,
    origin.lng,
    addressReveal,
    distanceLabel,
    routeSessionDisplayOrders,
  ]);

  function applySkipHouse(house: PublicHouse) {
    const wasSkipped = skips.skipped(house.id);
    const statusKey = skipStatusSnapshot(house, now, filters);
    const meta = {
      reason: "other" as SkipReasonId,
      temporary: false,
      statusKey,
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
  }

  function proceedWithSkipHouse(house: PublicHouse) {
    applySkipHouse(house);
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

  function applyClusterSkipAll(houses: PublicHouse[]) {
    for (const item of houses) {
      if (skips.skipped(item.id)) continue;
      applySkipHouse(item);
    }
  }

  function applyClusterVisitAll(houses: PublicHouse[]) {
    for (const item of houses) {
      if (visits.visited(item.id)) continue;
      performToggleVisited(item.id);
    }
  }

  function applyClusterLikeAll(houses: PublicHouse[]) {
    for (const item of houses) {
      if (likes.liked(item.id)) continue;
      onToggleLike(item.id);
    }
  }

  function applyClusterUnlikeAll(houses: PublicHouse[]) {
    for (const item of houses) {
      if (!likes.liked(item.id)) continue;
      onToggleLike(item.id);
    }
  }

  function applyClusterRestoreAll(houses: PublicHouse[]) {
    for (const item of houses) {
      if (skips.skipped(item.id)) handleRestoreHouse(item.id);
    }
  }

  function applyClusterUnvisitAll(houses: PublicHouse[]) {
    for (const item of houses) {
      if (visits.visited(item.id)) performToggleVisited(item.id);
    }
  }

  function handleClusterSkipAll(houses: PublicHouse[]) {
    const pending = houses.filter((item) => !skips.skipped(item.id));
    if (pending.length === 0) return;
    if (pending.some((item) => visits.visited(item.id)) && shouldAskVisitSkipConflict()) {
      setVisitSkipConflict({
        kind: "skip-all",
        house: pending[0]!,
        cluster: true,
        clusterHouses: houses,
      });
      return;
    }
    applyClusterSkipAll(pending);
  }

  function handleClusterVisitAll(houses: PublicHouse[]) {
    const pending = houses.filter((item) => !visits.visited(item.id));
    if (pending.length === 0) return;
    if (pending.some((item) => skips.skipped(item.id)) && shouldAskVisitSkipConflict()) {
      setVisitSkipConflict({
        kind: "visit-all",
        house: pending[0]!,
        cluster: true,
        clusterHouses: houses,
      });
      return;
    }
    applyClusterVisitAll(pending);
  }

  function confirmVisitSkipConflict(dismissFuture: boolean) {
    const pending = visitSkipConflict;
    setVisitSkipConflict(null);
    if (!pending) return;
    if (dismissFuture) dismissVisitSkipConflictPrompt();
    if (pending.kind === "visit-all") {
      applyClusterVisitAll(pending.clusterHouses ?? [pending.house]);
      return;
    }
    if (pending.kind === "skip-all") {
      applyClusterSkipAll(pending.clusterHouses ?? [pending.house]);
      return;
    }
    if (pending.kind === "visit") {
      performToggleVisited(pending.house.id);
      return;
    }
    proceedWithSkipHouse(pending.house);
  }

  /** Restore one skipped house — no route-change prompt (explicit user action). */
  function handleRestoreHouse(id: string) {
    if (!skips.skipped(id)) return;
    skips.unskip(id);
  }

  const skipRestoreUndoPrompt = useSkipRestoreUndoPrompt({
    houses,
    skippedIds: skips.skippedIds,
    metaFor: skips.meta,
    filters,
    now,
  });
  const skipRestorePromptHouse = skipRestoreUndoPrompt.promptHouseId
    ? houses.find((item) => item.id === skipRestoreUndoPrompt.promptHouseId)
    : null;
  const skipRestorePromptMeta = skipRestorePromptHouse
    ? skips.meta(skipRestorePromptHouse.id)
    : undefined;

  const { line: routeLine, segments: routeLineSegments } = useRouteGeometry(
    routePlan,
    routeMode,
    visits.visitedIds,
    skips.skippedIds,
    routeMode,
  );
  const summaryProps = {
    filteredHouses: visible.length,
    route: activeRoute ?? filterRoute,
    skippedCount: countSkippedInSet(skips.skippedIds, visible, activeHouseSet),
    visitedCount: countVisitedInSet(visits.visitedIds, visible, activeHouseSet),
    likedCount: countLikedInSet([...likes.likedIds], visible, activeHouseSet),
    gemCollectedCount: gemHuntActive ? gems.collectedIds.length : 0,
    showPersonalMarks: gemUi,
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
    if (readHomeView() === "list") {
      setView("list");
      selection.closeSelection();
    }
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
    const deviceOwner = adminDeviceOwnerPowers(admin, gemPreviewAsUser);
    const isOwned = owned.some((item) => item.id === house.id);
    editFlow.openEdit(house, {
      editCode: deviceOwner
        ? editCodeById.get(house.id)
        : owned.find((item) => item.id === house.id)?.editCode,
      admin: deviceOwner,
      allowDelete: allowDelete || Boolean(deviceOwner || isOwned),
    });
  }

  function openOnMap(id: string) {
    const house =
      houses.find((item) => item.id === id) ??
      visible.find((item) => item.id === id) ??
      mapListHouses.find((item) => item.id === id);
    if (house) selection.selectOnMap(house, { clusterOverview: false });
    else selection.showOnMap(id);
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
          visitSkipConflict ||
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
      visitSkipConflict,
      editFlow.flow,
    ],
  );

  /** Keep list DOM mounted while house edit is open so scroll position is not lost. */
  const listContentObscured = useMemo(
    () => mapListObscured && !(view === "list" && editFlow.flow),
    [mapListObscured, view, editFlow.flow],
  );

  useLayoutEffect(() => {
    setMapListSuspended(mapListObscured);
  }, [mapListObscured]);

  useEffect(() => {
    const el = listScrollRef.current;
    if (!el || view !== "list") return;
    const onScroll = () => {
      if (listContentObscured) return;
      savedListScrollTopRef.current = el.scrollTop;
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [view, routeMode, listContentObscured]);

  useLayoutEffect(() => {
    if (listContentObscured || view !== "list") return;
    const el = listScrollRef.current;
    if (!el) return;
    const y = savedListScrollTopRef.current;
    el.scrollTop = y;
    requestAnimationFrame(() => {
      el.scrollTop = y;
    });
  }, [listContentObscured, view, routeMode, visible.length, gems.collectedIds.length]);

  useEffect(() => {
    const focusId = selection.listFocusId;
    if (view !== "list" || !focusId || listContentObscured) return;
    const scrollToHouse = () => {
      const root = listScrollRef.current;
      const row = root?.querySelector(`[data-list-house-id="${CSS.escape(focusId)}"]`);
      if (row instanceof HTMLElement) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    scrollToHouse();
    const t = window.setTimeout(scrollToHouse, 150);
    return () => window.clearTimeout(t);
  }, [view, selection.listFocusId, listContentObscured, visible.length]);

  const selectedFilterReasons = selected
    ? (() => {
        const reasons = houseFilterMismatchReasons(selected, filters, filterContext);
        return reasons.length > 0 ? reasons : undefined;
      })()
    : undefined;

  const houseActionContext = useMemo((): HouseCardActionContext => {
    return {
      admin,
      catalogSource: source,
      liked: likes.liked,
      visited: visits.visited,
      skipped: skips.skipped,
      gemCollected: admin ? gems.collected : undefined,
      onToggleLike,
      onToggleVisited,
      onToggleGem: gemUi ? handleToggleGemMenu : undefined,
      gemQuickActionEligible: gemUi ? gemHouseHuntAllowed : undefined,
      onSkip: handleSkipHouse,
      onRestore: handleRestoreHouse,
      onShowOnMap:
        view === "list"
          ? openOnMap
          : undefined,
      onShowInList:
        view === "map"
          ? (id) => {
              if (!matchedIds.has(id)) return;
              selection.showInListFromMap(id);
              setView("list");
            }
          : undefined,
      onClusterVisitAll: handleClusterVisitAll,
      onClusterUnvisitAll: applyClusterUnvisitAll,
      onClusterSkipAll: handleClusterSkipAll,
      onClusterRestoreAll: applyClusterRestoreAll,
      onClusterLikeAll: applyClusterLikeAll,
      onClusterUnlikeAll: applyClusterUnlikeAll,
      onClusterFindAllGems: gemAdminTools ? openGemHuntForCluster : undefined,
      onClusterResetAllGems: gemAdminTools ? handleClusterResetAllGems : undefined,
      canEdit: (id) =>
        Boolean(adminDeviceOwnerPowers(admin, gemPreviewAsUser) || owned.some((item) => item.id === id)),
      editCodeFor: (id) =>
        adminDeviceOwnerPowers(admin, gemPreviewAsUser)
          ? editCodeById.get(id)
          : owned.find((item) => item.id === id)?.editCode,
      onEdit: (house) => requestHouseEdit(house, true),
      nightPassesEnabled: nightPass.enabled,
      onNightPasses: (house) => openOwnerPasses(house.id),
      onPlaceGem: gemUi
        ? (house) =>
            openGemPlacer(
              house,
              adminDeviceOwnerPowers(admin, gemPreviewAsUser)
                ? editCodeById.get(house.id)
                : owned.find((item) => item.id === house.id)?.editCode,
            )
        : undefined,
      skipMetaFor: (id) => skips.meta(id),
      onApproveSkipReturn: (id) => {
        const prev = skips.meta(id);
        if (!prev) return;
        const trigger = primaryRestoreTriggerFromSnapshot(prev.statusKey);
        if (!trigger) return;
        skips.update(id, {
          ...prev,
          temporary: true,
          restoreTriggers: [trigger],
          reason: trigger,
        });
      },
      onRevokeSkipReturn: (id) => {
        const prev = skips.meta(id);
        if (!prev) return;
        skips.update(id, {
          ...prev,
          temporary: false,
          restoreTriggers: [],
          reason: "other",
        });
      },
      editingId: editFlow.flow?.house.id ?? null,
    };
  }, [
    openGemPlacer,
    admin,
    gemPreviewAsUser,
    nightPass.enabled,
    openOwnerPasses,
    gemAdminTools,
    source,
    likes.liked,
    visits.visited,
    skips,
    gemUi,
    gemFeatureOn,
    gems.collected,
    onToggleLike,
    onToggleVisited,
    gemHouseHuntAllowed,
    handleToggleGemMenu,
    openGemHuntForCluster,
    handleClusterResetAllGems,
    handleSkipHouse,
    handleRestoreHouse,
    view,
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
        index:
          routeMode && activeRoute && routeSessionDisplayOrders
            ? (() => {
                const stop = activeRoute.stops.find((item) =>
                  item.houses.some((h) => h.id === selected.id),
                );
                if (!stop) {
                  return routeSessionDisplayOrders.get(selected.id) ?? selection.selectedListIndex;
                }
                return routeDisplayOrder(
                  selected.id,
                  stop.order,
                  routeSessionDisplayOrders,
                );
              })()
            : selection.selectedListIndex,
        onClose: selection.closeSelection,
        liked: likes.liked,
        visited: visits.visited,
        gemCollected: admin ? gems.collected : undefined,
        clusterOverview: selection.clusterOverview,
        openedFromList: selection.openedFromList,
        clusterHouses: selection.selectedCluster,
        now,
        skippedIds: skips.skipped,
        filteredOutIds: (id: string) => filterDimActive && !matchedIds.has(id),
        onAdjacentClusterHouse: selection.selectAdjacentClusterHouse,
      }
    : null;

  return (
    <AdminHouseFieldsProvider adminHouses={adminHouses} enabled={restoreRedactedLocations}>
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
            activeFilterCount={activeFilterCount}
            onOpenFilters={() => setFiltersOpen(true)}
            originShifted={originChoice.kind !== "gps"}
            onOpenOriginPicker={() => originPick.setOriginPickerOpen(true)}
            routeMode={routeMode}
            onToggleRoute={() => (routeMode ? exitRouteMode() : enterRouteMode())}
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
            gemMapToggleEnabled={gemUi}
            gemMapVisible={mapDiamondsVisible}
            gemNearSignal={mapGemNearSignal}
            onToggleGemMap={() => setMapDiamondsVisible((on) => !on)}
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
        {selection.selected ? houseSelectionAnnouncement(selection.selected, addressReveal) : ""}
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
            showGemFilters={gemUi}
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
      <NightPassBanner houseSet={activeHouseSet} />
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
          <div
            className={cn(
              "map-stage absolute inset-0 z-0 isolate",
              view !== "map" && "invisible pointer-events-none",
            )}
            style={{ position: "absolute", inset: 0 }}
            aria-hidden={view !== "map"}
          >
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
                  followSelection={Boolean(
                    view === "map" &&
                      selection.selected &&
                      !originPick.originPickActive &&
                      !mapGemHouse,
                  )}
                  userLocation={gps}
                  locating={geo.status === "pending" && askedLocation}
                  onLocate={originPick.goToMyLocation}
                  routeModeActive={routeMode && !originPick.originPickActive}
                  routeLine={routeMode && !originPick.originPickActive ? routeLine : null}
                  routeLineSegments={
                    routeMode && !originPick.originPickActive ? routeLineSegments : null
                  }
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
                    routeMode && routePlan && !originPick.originPickActive
                      ? routePlan.stops.map((stop) => ({
                          id: stop.house.id,
                          order: routeDisplayOrder(
                            stop.house.id,
                            stop.order,
                            routeSessionDisplayOrders,
                          ),
                          lat: stop.house.lat,
                          lng: stop.house.lng,
                        }))
                      : null
                  }
                  routeSessionDisplayOrders={
                    routeMode && !originPick.originPickActive ? routeSessionDisplayOrders : null
                  }
                  showGemLegend={showGemMapLegend}
                  gemAnchorHouses={gemUi ? gemMapRingHousesVisible : []}
                  showGemPinRings={gemUi && mapDiamondsVisible}
                  isGemCollected={gems.collected}
                  gemCamFabEnabled={gemUi}
                  gemCamFabHuntOpen={Boolean(mapGemHouse)}
                  gemCamFabNearSignal={mapGemNearSignal}
                  onOpenGemCamFab={() => void openGemHuntFromMapFab()}
                />
              {view === "map" && originPick.originPickActive ? (
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
                  hidden={view !== "map" || (Boolean(selection.selected) && !originPick.originPickActive)}
                  houseSetLabel={
                    adminForHouseSet ? formatMapDisplayLayersStatus(layers) : null
                  }
                />
          </div>
          {view === "map" &&
          mapSheetHouse &&
          houseDetailCommon &&
          !mapGemHouse &&
          !originPick.originPickActive ? (
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
            <div
              ref={listScrollRef}
              id="house-list-skip"
              className={cn(
                "absolute inset-0 z-10 overflow-y-auto bg-[#12081a]",
                view !== "list" && "invisible pointer-events-none",
              )}
              style={{ position: "absolute", inset: 0, overflowY: "auto", background: "#12081a" }}
              role="region"
              aria-label="רשימת בתים"
              aria-hidden={view !== "list"}
            >
              <div className="mx-auto w-full min-w-0 max-w-3xl px-3 pt-3">
                {routeMode ? (
                  <div className="min-w-0 rounded-3xl bg-[#160b20] p-2 ring-1 ring-orange-500/40">
                    <StatsSummary {...summaryProps} compact />
                  </div>
                ) : null}
                {listContentObscured ? (
                  <div className="min-h-[40vh] w-full bg-[#12081a]" aria-hidden />
                ) : routeMode ? (
                  <RouteList
                    items={routeListItems}
                    actionContext={houseActionContext}
                    originLabel={routePlan?.originLabel}
                    startedFrom={routePlan?.startedFrom}
                    hasGps={Boolean(gps)}
                    onRequestLocation={gpsAllowed ? originPick.chooseGpsOrigin : undefined}
                    onChangeOrigin={() => originPick.setOriginPickerOpen(true)}
                    focusId={selection.listFocusId}
                  />
                ) : (
                  <HouseList
                    houses={visibleForList}
                    origin={origin}
                    now={now}
                    actionContext={houseActionContext}
                    focusId={selection.listFocusId}
                    insetX="flush"
                  />
                )}
              </div>
            </div>
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
          gpsHint={geoLocationHintHe(geo.status)}
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
      {visitSkipConflict ? (
        <VisitSkipConflictDialog
          open
          kind={visitSkipConflict.kind}
          house={visitSkipConflict.house}
          cluster={visitSkipConflict.cluster}
          clusterHouses={visitSkipConflict.clusterHouses}
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
      {clusterGemSessionSummary ? (
        <GemClusterSessionSummary
          open
          catches={clusterGemSessionSummary}
          onClose={() => setClusterGemSessionSummary(null)}
        />
      ) : null}
      {gemPlacerDialog}
      {skipRestorePromptHouse && skipRestorePromptMeta ? (
        <SkipRestoreUndoDialog
          house={skipRestorePromptHouse}
          meta={skipRestorePromptMeta}
          open
          onConfirmUnskip={() => {
            handleRestoreHouse(skipRestorePromptHouse.id);
            skipRestoreUndoPrompt.clearPrompt();
          }}
          onDismiss={skipRestoreUndoPrompt.dismissPrompt}
        />
      ) : null}
      {gemResetHouse || gemResetCluster ? (
        <GemResetConfirmDialog
          open
          house={gemResetHouse ?? gemResetCluster?.[0] ?? null}
          cluster={Boolean(gemResetCluster && gemResetCluster.length >= 2)}
          clusterHouses={gemResetCluster ?? undefined}
          onConfirm={confirmGemReset}
          onCancel={cancelGemReset}
        />
      ) : null}
      {mapGemHouse ? (
        <GemHuntExperienceLazy
          house={mapGemHouse}
          userLocation={gps ?? mapGemGps}
          deferCameraUntilInRange={false}
          collectEnabled={canCollectGem(
            gps ?? mapGemGps,
            mapGemHouse,
            gems.collected(mapGemHouse.id),
            true,
            false,
          )}
          initialWebXrSession={mapGemWebXrSession}
          tellMeHuntRadiusEnforced={gemTellMeHuntRadiusEnforced(admin, gemPreviewAsUser)}
          onBeforeNavigationAssist={
            mapGemClusterMembers ? undefined : pinMapGemNavigationTarget
          }
          encounterMode={!mapGemClusterMembers || isIosLike()}
          repeatVisit={!mapGemClusterMembers && gems.collected(mapGemHouse.id)}
          campusQueue={mapGemClusterQueueUi}
          onClusterFinishSession={
            mapGemClusterMembers ? finishMapGemClusterSession : undefined
          }
          onClusterSkipHouse={mapGemClusterMembers ? skipMapGemClusterHouse : undefined}
          clusterSkipAvailable={mapGemClusterSkipAvailable}
          clusterFinishAvailable={mapGemClusterCatchCount > 0}
          onCollectPersist={
            mapGemClusterMembers
              ? (monsterId) => {
                  const h = mapGemHouse;
                  const before = loadGemCollected();
                  const isNew =
                    !gems.collected(h.id) && !isGemTypeInCollection(monsterId, before);
                  mapGemClusterSessionRef.current.push({
                    house: h,
                    monsterId,
                    isNew,
                  });
                  gems.collect(h.id, monsterId);
                  setMapGemClusterCatchCount((n) => n + 1);
                  celebrateGemCollect();
                }
              : undefined
          }
          onCampusStepComplete={
            mapGemClusterMembers
              ? () => {
                  const h = mapGemHouse;
                  const members = mapGemClusterMembers;
                  const next = nextClusterGemHouse(members, gems.collected, h.id);
                  if (next) {
                    setMapGemHouse(next);
                    return;
                  }
                  const session = [...mapGemClusterSessionRef.current];
                  mapGemClusterSessionRef.current = [];
                  closeMapGemHunt();
                  if (session.length > 0 && members.length >= 2) {
                    setClusterGemSessionSummary(session);
                  } else if (session.length === 1) {
                    showMapGemCheer(session[0]!.house, session[0]!.monsterId);
                  }
                }
              : undefined
          }
          onClose={closeMapGemHunt}
          onCollect={(monsterId, options) => {
            if (mapGemClusterMembers) return;
            const h = mapGemHouse;
            const collectedBefore = loadGemCollected();
            const celebrate =
              options?.navigateStickerBook
                ? gemBagCelebrateAfterCollect(gemMapRingHouses, collectedBefore, h.id, monsterId)
                : null;
            gems.collect(h.id, monsterId);
            closeMapGemHunt();
            celebrateGemCollect();
            if (options?.navigateStickerBook) {
              router.push(gemBagCollectHref(monsterId, celebrate));
              return;
            }
            if (options?.cheer !== false) {
              showMapGemCheer(h, monsterId);
            }
          }}
        />
      ) : null}
      <GemCheer
        show={Boolean(mapGemCheerHouse && mapGemCheerMonster)}
        house={mapGemCheerHouse ?? undefined}
        monsterId={mapGemCheerMonster ?? undefined}
      />
    </div>
    </AdminHouseFieldsProvider>
  );
}
