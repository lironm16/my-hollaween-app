"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AppHeader } from "@/components/app-header";
import { CatalogMetaChip } from "@/components/catalog-meta-chip";
import { FiltersSheet } from "@/components/filter-menu";
import { HouseFiltersContent } from "@/components/house-filters-content";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { HouseList } from "@/components/house-list";
import { MapStats, StatsSummary } from "@/components/map-stats";
import { HouseDetailOverlay } from "@/components/house-detail-overlay";
import { MapHouseSheet } from "@/components/map-house-sheet";
import { HouseEditFlowPanels, useHouseEditFlow } from "@/components/house-edit-flow";
import { NeighborhoodStatusBanners } from "@/components/neighborhood-status-banners";
import { TempSkipRestoreAlerts } from "@/components/temp-skip-restore-alert";
import {
  emitTempSkipRestoreAlert,
  useTempSkipRestoreAlerts,
} from "@/hooks/use-temp-skip-restore-alerts";
import { NeighborhoodToolbar } from "@/components/neighborhood-toolbar";
import { OriginPickerSheet } from "@/components/origin-picker";
import { RouteList } from "@/components/route-list";
import { SkipHouseDialog } from "@/components/skip-house-dialog";
import { LikeCheer } from "@/components/like-cheer";
import { RouteCompleteCheer } from "@/components/route-complete-cheer";
import { VisitCheer } from "@/components/visit-cheer";
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
import { config } from "@/lib/config";
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
import { HOUSE_SET_LABELS, countSkippedInSet, houseMatchesSet } from "@/lib/house-set";
import { filterHouses, houseFilterMismatchReasons } from "@/lib/filter-houses";
import { formatDistance } from "@/lib/geo";
import { isRouteFullyVisited } from "@/lib/route-completion";
import { buildWalkingRoute } from "@/lib/route";
import { diffRouteBySkippedIds, rebuildRouteAfterSkipChange } from "@/lib/route-changes";
import { drainPendingRouteRestores } from "@/lib/route-mode";
import {
  availableTemporaryRestoreOptions,
  skipStatusSnapshot,
  shouldEmitTemporarySkipRestoreAlert,
  temporaryRestoreAlertText,
  temporaryRestoreReasonMet,
  type SkipReasonId,
} from "@/lib/skip-reasons";
import { houseSelectionAnnouncement } from "@/lib/map-a11y";
import type { Catalog, PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NeighborhoodApp({
  initialCatalog,
  focusId = null,
}: {
  initialCatalog?: Catalog | null;
  focusId?: string | null;
}) {
  const { catalog, loading, offline, unreachable, error, source, refresh } = useCatalog(initialCatalog);
  const { admin } = useAdminSession();
  const geo = useUserLocation();
  const gps = geo.location;
  const gpsAllowed =
    geo.status === "idle" || geo.status === "pending" || geo.status === "ready";
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
  const { alerts: tempRestoreAlerts, dismiss: dismissTempRestoreAlert } = useTempSkipRestoreAlerts();
  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const skips = useSkippedHouses();
  const owned = useOwnedHouses();
  const now = useAppNow();
  useEffect(() => {
    applyClockSearchParams(window.location.search);
  }, []);

  function setView(next: HomeView) {
    writeHomeView(next);
  }

  const {
    adminHouses,
    applyAdminHouse,
    removeAdminHouse,
  } = useAdminHouses({ admin, refresh });

  const wasAdmin = useRef(false);

  const editCodeById = useMemo(() => {
    const map = new Map<string, string>();
    for (const house of adminHouses) map.set(house.id, house.editCode);
    return map;
  }, [adminHouses]);

  const houses = useMergedHouses({
    catalogHouses: catalog?.houses ?? [],
    owned,
    admin,
    adminHouses,
  });

  const housesForSkipCount = useMemo(() => {
    const byId = new Map(houses.map((house) => [house.id, house]));
    for (const house of catalog?.houses ?? []) {
      if (!byId.has(house.id)) byId.set(house.id, house);
    }
    return [...byId.values()];
  }, [houses, catalog?.houses]);

  const filterContext = useMemo(
    () => ({
      houseSet: activeHouseSet,
      likedIds: likes.likedIds,
      visitedIds: visits.visitedIds,
      skippedIds: skips.skippedIds,
      now,
    }),
    [activeHouseSet, likes.likedIds, visits.visitedIds, skips.skippedIds, now],
  );

  const mapHouses = useMemo(
    () => houses.filter((house) => houseMatchesSet(house, activeHouseSet)),
    [houses, activeHouseSet],
  );
  const visible = useMemo(() => filterHouses(houses, filters, filterContext), [houses, filters, filterContext]);
  const matchedIds = useMemo(() => new Set(visible.map((house) => house.id)), [visible]);
  const filterDimActive = matchedIds.size < mapHouses.length;
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const selection = useHouseSelection({ focusId, visible, houses });
  const { resetForNavigation } = selection;
  const editFlow = useHouseEditFlow();

  const ownedEditCode = useMemo(() => {
    if (!selection.editHouseId) return undefined;
    return owned.find((item) => item.id === selection.editHouseId)?.editCode;
  }, [owned, selection.editHouseId]);
  const canEditSelected = Boolean(admin || ownedEditCode);

  const {
    routeMode,
    pinnedRoute,
    setPinnedRoute,
    routeFitTick,
    filterRoute,
    pinCurrentRoute,
    enterRouteMode: startRouteMode,
    exitRouteMode,
    pendingRouteGps,
    rebuildPinnedRoute,
  } = useNeighborhoodRoute({
    visible,
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
    houses,
    filterContext,
    routeMode,
    pinnedRoute,
    setPinnedRoute,
    origin,
    visitedIds: visits.visitedIds,
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
    if (gpsAllowed || originChoice.kind !== "gps") return;
    setOriginChoice({ kind: "neighborhood" });
  }, [gpsAllowed, originChoice.kind, setOriginChoice]);

  useEffect(() => {
    if (wasAdmin.current && !admin) {
      resetForNavigation();
      void refresh(true);
    }
    wasAdmin.current = admin;
  }, [admin, refresh, resetForNavigation]);

  const walkingRoute = routeMode ? pinnedRoute : null;
  const activeRoute = routeMode ? (walkingRoute ?? filterRoute) : null;
  const visitCelebration = useCallback(
    (_id: string, nextVisitedIds: string[]) => {
      if (!routeMode || !walkingRoute) return "visit";
      return isRouteFullyVisited(walkingRoute, skips.skippedIds, nextVisitedIds)
        ? "route-complete"
        : "visit";
    },
    [routeMode, walkingRoute, skips.skippedIds],
  );
  const { onToggleLike, onToggleVisited, visitCheer, routeCompleteCheer, likeCheer } = useHouseActions(
    likes,
    visits,
    { visitCelebration },
  );
  const routeListItems = useMemo(() => {
    if (!routeMode) return [];
    const skippedSet = new Set(skips.skippedIds);
    const eligible = filters.unvisitedOnly
      ? visible.filter((house) => !visits.visitedIds.includes(house.id))
      : visible;
    const orderRoute = buildWalkingRoute(
      eligible,
      { lat: origin.lat, lng: origin.lng },
      {
        accessible: accessibleOnly,
        startedFrom: origin.kind,
        originLabel: origin.label,
      },
    );
    if (!orderRoute) return [];
    return orderRoute.stops.flatMap((stop) =>
      stop.houses.map((house, houseIndex) => ({
        house,
        order: stop.order,
        hop: houseIndex > 0 ? "אותו בניין" : formatDistance(stop.fromPreviousMeters),
        skipped: skippedSet.has(house.id),
      })),
    );
  }, [
    routeMode,
    visible,
    skips.skippedIds,
    origin,
    accessibleOnly,
    filters.unvisitedOnly,
    visits.visitedIds,
  ]);

  function applyRouteAfterSkipChange(nextSkippedIds: string[], includeNew: boolean) {
    setPinnedRoute(
      rebuildRouteAfterSkipChange(
        pinnedRoute,
        houses,
        filters,
        filterContext,
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
      return temporaryRestoreReasonMet(house, meta.reason as SkipReasonId, now, filters);
    });
    if (toRestore.length === 0) return;
    for (const id of toRestore) {
      const house = houseById.get(id);
      const meta = skips.meta(id);
      if (!house || !meta) continue;
      if (shouldEmitTemporarySkipRestoreAlert(meta)) {
        emitTempSkipRestoreAlert({
          id,
          message: temporaryRestoreAlertText(house, meta.reason as SkipReasonId),
        });
      }
    }
    const nextSkippedIds = skips.skippedIds.filter((id) => !toRestore.includes(id));
    for (const id of toRestore) skips.unskip(id);
    if (routeMode) {
      applyRouteAfterSkipChange(nextSkippedIds, true);
    }
  }, [routeMode, housesForSkipCount, now, filters, skips.skippedIds.join("\0")]);

  function handleSkipHouse(id: string) {
    const house = houses.find((item) => item.id === id);
    if (!house) return;
    setSkipDialogHouse(house);
  }

  function confirmSkipHouse(reason: SkipReasonId, temporary: boolean) {
    const house = skipDialogHouse;
    if (!house) return;
    const wasSkipped = skips.skipped(house.id);
    setSkipDialogHouse(null);
    const meta = {
      reason,
      temporary,
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
      applyRouteAfterSkipChange(nextSkippedIds, false);
    }
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
  const { line: routeLine } = useRouteGeometry(activeRoute, routeMode, {
    straightOnly: activeHouseSet === "stubs",
  });
  const summaryProps = {
    filteredHouses: visible.length,
    route: activeRoute ?? filterRoute,
    skippedCount: routeMode
      ? countSkippedInSet(skips.skippedIds, housesForSkipCount, activeHouseSet)
      : 0,
    staleLabel: offline
      ? "לא מקוון"
      : unreachable
        ? "השרת לא עונה"
        : source === "snapshot"
          ? "עותק סטטי"
          : source === "cache"
            ? "שמור בטלפון"
            : null,
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
  const selectedFilterReasons = selected
    ? (() => {
        const reasons = houseFilterMismatchReasons(selected, filters, filterContext);
        return reasons.length > 0 ? reasons : undefined;
      })()
    : undefined;
  const houseDetailCommon = selected
    ? {
        house: selected,
        index: selection.selectedListIndex,
        onClose: selection.closeSelection,
        liked: likes.liked,
        onToggleLike,
        visited: visits.visited,
        onToggleVisited,
        catalogSource: source,
        managerEditCode: admin ? editCodeById.get(selected.id) : undefined,
        editCodeFor: (id: string) =>
          admin ? editCodeById.get(id) : owned.find((item) => item.id === id)?.editCode,
        canEditHouse: (id: string) => Boolean(admin || owned.some((item) => item.id === id)),
        editing: false,
        onToggleEdit: canEditSelected ? () => requestHouseEdit(selected, true) : undefined,
        clusterOverview: selection.clusterOverview,
        clusterHouses: selection.selectedCluster,
      }
    : null;

  return (
    <div
      id="neighborhood-shell"
      className="relative isolate flex flex-col overflow-hidden"
      style={{ display: "flex", flexDirection: "column", height: "var(--app-h, 100svh)", overflow: "hidden" }}
    >
      <AppHeader onHomeTap={goHome} />
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
        routeTicker={originPick.routeTicker}
      />
      <FiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        activeCount={sheetActiveCount}
        resultCount={sheetResultCount}
        onClear={resetFilterDraft}
        onSave={commitFilterDraft}
        saveDisabled={Boolean(visitWindowInvalid)}
      >
        <HouseFiltersContent filters={sheetFilters} now={now} onPatch={patchFilterDraft} />
      </FiltersSheet>
      <NeighborhoodStatusBanners
        outsideBanner={originPick.outsideBanner}
        offline={offline}
        unreachable={unreachable}
        error={error}
        hasCachedHouses={houses.length > 0}
      />
      <TempSkipRestoreAlerts alerts={tempRestoreAlerts} onDismiss={dismissTempRestoreAlert} />
      <main
        className="relative z-0 min-h-0 flex-1 isolate overflow-hidden"
        style={{ flex: 1, minHeight: 0, position: "relative" }}
      >
        {loading && houses.length === 0 ? (
          <div className="flex h-full items-center justify-center text-orange-200">
            מדליקים דלעות…
          </div>
        ) : (
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
                filterDimActive={filterDimActive}
                selectedId={originPick.originPickActive ? null : selection.selected?.id}
                clusterOverview={selection.clusterOverview}
                expandedClusterKey={selection.expandedClusterKey}
                onSelect={(house, opts) => {
                  if (originPick.originPickActive) return;
                  selection.selectOnMap(house, opts);
                }}
                onClose={selection.closeSelection}
                onCollapseCluster={selection.collapseCluster}
                className="h-full w-full"
                active={view === "map"}
                userLocation={gps}
                locating={geo.status === "pending" && askedLocation}
                onLocate={originPick.goToMyLocation}
                routeLine={routeMode && !originPick.originPickActive ? routeLine : null}
                routeFitTick={routeMode && !originPick.originPickActive ? routeFitTick : 0}
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
              />
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
              {mapSheetHouse && houseDetailCommon && view === "map" && !originPick.originPickActive ? (
                <MapHouseSheet
                  {...houseDetailCommon}
                  skipped={skips.skipped(mapSheetHouse.id)}
                  onSkip={
                    !skips.skipped(mapSheetHouse.id)
                      ? () => handleSkipHouse(mapSheetHouse.id)
                      : undefined
                  }
                  onRestoreRoute={
                    skips.skipped(mapSheetHouse.id)
                      ? () => handleRestoreHouse(mapSheetHouse.id)
                      : undefined
                  }
                  filterMismatchReasons={selectedFilterReasons}
                  skipMeta={
                    skips.skipped(mapSheetHouse.id) ? skips.meta(mapSheetHouse.id) : undefined
                  }
                  onShowInList={
                    matchedIds.has(mapSheetHouse.id)
                      ? () => {
                          selection.showInListFromMap(mapSheetHouse.id);
                          setView("list");
                        }
                      : undefined
                  }
                />
              ) : null}
              <CatalogMetaChip
                hidden={Boolean(selection.selected) && !originPick.originPickActive}
                houseSetLabel={admin ? HOUSE_SET_LABELS[activeHouseSet] : null}
              />
            </div>
            <div
              id="house-list-skip"
              className={cn(
                "absolute inset-0 overflow-y-auto bg-[#12081a]",
                view === "list" ? "z-10" : "invisible pointer-events-none z-0",
              )}
              style={{ position: "absolute", inset: 0, overflowY: "auto", background: "#12081a" }}
              aria-hidden={view !== "list"}
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
                {routeMode ? (
                  <RouteList
                    items={routeListItems}
                    originLabel={activeRoute?.originLabel}
                    startedFrom={activeRoute?.startedFrom}
                    hasGps={Boolean(gps)}
                    onRequestLocation={gpsAllowed ? originPick.chooseGpsOrigin : undefined}
                    onChangeOrigin={() => originPick.setOriginPickerOpen(true)}
                    selectedId={selection.selected?.id ?? null}
                    focusId={selection.listFocusId}
                    catalogSource={source}
                    likedIds={likes.likedIds}
                    onToggleLike={onToggleLike}
                    visitedIds={visits.visitedIds}
                    onToggleVisited={onToggleVisited}
                    onSkipHouse={handleSkipHouse}
                    onRestoreHouse={handleRestoreHouse}
                    skipMetaFor={(id) => skips.meta(id)}
                    admin={admin}
                    canEditHouse={(id) => Boolean(admin || owned.some((item) => item.id === id))}
                    onShowOnMap={openOnMap}
                    onSelectHouse={selection.selectInList}
                    onEditHouse={(id) => {
                      selection.dismissForOverlay();
                      const house = visible.find((item) => item.id === id) ?? houses.find((item) => item.id === id);
                      if (house) requestHouseEdit(house, true);
                    }}
                    editingId={null}
                  />
                ) : (
                  <HouseList
                    houses={visible}
                    origin={origin}
                    catalogSource={source}
                    likedIds={likes.likedIds}
                    onToggleLike={onToggleLike}
                    visitedIds={visits.visitedIds}
                    onToggleVisited={onToggleVisited}
                    skippedIds={skips.skippedIds}
                    skipMetaFor={(id) => skips.meta(id)}
                    onSkipHouse={handleSkipHouse}
                    onRestoreHouse={handleRestoreHouse}
                    admin={admin}
                    canEditHouse={(id) => Boolean(admin || owned.some((item) => item.id === id))}
                    onShowOnMap={openOnMap}
                    onSelectHouse={selection.selectInList}
                    onEditHouse={(id) => {
                      selection.dismissForOverlay();
                      const house = visible.find((item) => item.id === id) ?? houses.find((item) => item.id === id);
                      if (house) requestHouseEdit(house, true);
                    }}
                    selectedId={selection.selected?.id ?? null}
                    focusId={selection.listFocusId}
                    editingId={null}
                  />
                )}
            </div>
          </>
        )}
        {houseDetailCommon && view === "list" && !originPick.originPickActive && !editFlow.flow ? (
          <HouseDetailOverlay
            {...houseDetailCommon}
            skipped={skips.skipped(houseDetailCommon.house.id)}
            onSkip={
              !skips.skipped(houseDetailCommon.house.id)
                ? () => handleSkipHouse(houseDetailCommon.house.id)
                : undefined
            }
            onRestoreRoute={
              skips.skipped(houseDetailCommon.house.id)
                ? () => handleRestoreHouse(houseDetailCommon.house.id)
                : undefined
            }
            filterMismatchReasons={selectedFilterReasons}
            skipMeta={
              skips.skipped(houseDetailCommon.house.id)
                ? skips.meta(houseDetailCommon.house.id)
                : undefined
            }
            onShowOnMap={() => {
              setView("map");
              selection.clearCluster();
            }}
            onSelectClusterHouse={(id) => {
              const house = houses.find((item) => item.id === id);
              if (house) selection.selectOnMap(house);
            }}
          />
        ) : null}
      </main>
      <OriginPickerSheet
        open={originPick.originPickerOpen}
        onOpenChange={originPick.setOriginPickerOpen}
        choice={originChoice}
        gpsAllowed={gpsAllowed}
        onChooseGps={originPick.chooseGpsOrigin}
        onChooseNeighborhood={originPick.chooseNeighborhoodOrigin}
        onChooseCustom={originPick.chooseCustomOrigin}
        onPickOnMap={originPick.startOriginPick}
      />
      <SkipHouseDialog
        open={Boolean(skipDialogHouse)}
        house={skipDialogHouse}
        filters={filters}
        now={now}
        existingMeta={skipDialogHouse ? skips.meta(skipDialogHouse.id) : undefined}
        onConfirm={confirmSkipHouse}
        onUnskip={skipDialogHouse && skips.skipped(skipDialogHouse.id) ? unskipFromDialog : undefined}
        onCancel={() => setSkipDialogHouse(null)}
      />
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
    </div>
  );
}
