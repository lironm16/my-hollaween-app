"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
import { NeighborhoodToolbar } from "@/components/neighborhood-toolbar";
import { OriginPickerSheet } from "@/components/origin-picker";
import { RouteList } from "@/components/route-list";
import { RouteStartCard } from "@/components/route-start-card";
import { RouteCompleteOverlay } from "@/components/route-complete-overlay";
import { RouteConfirmDialog } from "@/components/route-confirm-dialog";
import { VisitCheer } from "@/components/visit-cheer";
import { useRouteTravel } from "@/hooks/use-route-travel";
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
import { HOUSE_SET_LABELS, houseMatchesSet } from "@/lib/house-set";
import { filterHouses, houseFilterMismatchReasons } from "@/lib/filter-houses";
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
  const [routePrompt, setRoutePrompt] = useState<{
    kind: "enter-route" | "filter-change";
    title: string;
    description: string;
    confirmLabel: string;
    removedHouses?: string[];
    addedHouses?: string[];
    onConfirm: (includeNewHouses: boolean) => void;
  } | null>(null);

  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const owned = useOwnedHouses();
  const now = useAppNow();
  const { onToggleLike, onToggleVisited, visitCheer } = useHouseActions(likes, visits);

  useEffect(() => {
    applyClockSearchParams(window.location.search);
  }, []);

  function setView(next: HomeView) {
    writeHomeView(next);
  }

  const {
    adminHouses,
    busyAction,
    applyAdminHouse,
    approveHouse,
    rejectHouse,
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

  const filterContext = useMemo(
    () => ({
      houseSet: activeHouseSet,
      likedIds: likes.likedIds,
      visitedIds: visits.visitedIds,
      now,
    }),
    [activeHouseSet, likes.likedIds, visits.visitedIds, now],
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
  } = useNeighborhoodRoute({
    visible,
    houses,
    filters,
    filterContext,
    visitedIds: visits.visitedIds,
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
    now,
    setRoutePrompt,
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
  const { line: routeLine } = useRouteGeometry(activeRoute, routeMode);
  const routeTravel = useRouteTravel(activeRoute, routeMode);

  const routeTravelAnimating = routeTravel.sweepIndex !== null;

  function handleToggleVisited(id: string) {
    const marking = !visits.visited(id);
    onToggleVisited(id);
    if (routeMode && routeTravel.started && marking) {
      routeTravel.advanceAfterVisit(id);
    }
  }

  function handleSkipRouteStop(id: string) {
    if (!routeMode || !routeTravel.started) return;
    routeTravel.skipStop(id);
  }

  const summaryProps = {
    filteredHouses: visible.length,
    route: filterRoute,
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
  const housePendingNote =
    selected?.status === "pending" ? (
      <p className="mb-3 rounded-lg bg-violet-950/70 px-3 py-2 text-base text-violet-100">
        {admin
          ? "בית ממתין לאישור — עדיין לא במפה הציבורית."
          : "הבית הזה עדיין לא במפה הציבורית. אם זה הבית שלכם, מנהל יכול לאשר אותו."}
      </p>
    ) : null;
  const houseDetailExtra = selected ? (
    <div className="mt-4 space-y-3">
      {admin && selected.status === "pending" ? (
        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-500"
            disabled={busyAction}
            onClick={() => void approveHouse(selected.id)}
          >
            אישור למפה
          </Button>
          <Button
            variant="destructive"
            disabled={busyAction}
            onClick={() => {
              void rejectHouse(selected.id).then((ok) => {
                if (!ok) return;
                selection.closeSelection();
              });
            }}
          >
            דחייה ומחיקה
          </Button>
        </div>
      ) : null}
    </div>
  ) : null;
  const selectedFilterReasons =
    selected && !matchedIds.has(selected.id)
      ? houseFilterMismatchReasons(selected, filters, filterContext)
      : undefined;
  const selectedRouteCurrent =
    routeMode &&
    routeTravel.started &&
    selected &&
    routeTravel.currentStopId === selected.id;
  const houseDetailCommon = selected
    ? {
        house: selected,
        index: selection.selectedListIndex,
        onClose: selection.closeSelection,
        liked: likes.liked,
        onToggleLike,
        visited: visits.visited,
        onToggleVisited: handleToggleVisited,
        catalogSource: source,
        managerEditCode: admin ? editCodeById.get(selected.id) : undefined,
        editCodeFor: (id: string) =>
          admin ? editCodeById.get(id) : owned.find((item) => item.id === id)?.editCode,
        canEditHouse: (id: string) => Boolean(admin || owned.some((item) => item.id === id)),
        editing: false,
        onToggleEdit: canEditSelected ? () => requestHouseEdit(selected, true) : undefined,
        pendingNote: housePendingNote,
        extra: houseDetailExtra,
        clusterOverview: selection.clusterOverview,
        clusterHouses: selection.selectedCluster,
        routeCurrentStop: Boolean(selectedRouteCurrent),
        onSkipRouteStop: selectedRouteCurrent
          ? () => handleSkipRouteStop(selected.id)
          : undefined,
        routeTravelAnimating,
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
        {routeMode && activeRoute
          ? ` מסלול עם ${activeRoute.stops.length} עצירות.`
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
        includeTraffic={admin}
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
                routeMode && "is-route-active",
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
                routeStartFocusTick={routeTravel.focusTick}
                routeStart={routeMode ? origin : null}
                routeOriginLabel={
                  routeMode && activeRoute
                    ? activeRoute.originLabel ||
                      (activeRoute.startedFrom === "gps" ? "מיקום נוכחי" : "ממרכז השכונה")
                    : undefined
                }
                onRouteStart={routeMode && !routeTravel.started ? routeTravel.startTravel : undefined}
                routeStartedFrom={routeMode && activeRoute ? activeRoute.startedFrom : null}
                routeTravelStarted={routeMode ? routeTravel.started : false}
                routeTravelCompletedCount={routeTravel.completedCount}
                routeTravelSweepIndex={routeTravel.sweepIndex}
                routeTravelLineReveal={routeTravel.lineReveal}
                routeStopTravelState={routeTravel.stopState}
                visitedIds={visits.visitedIds}
                originMarker={origin.fromGps ? null : origin}
                originPickActive={originPick.originPickActive}
                originPick={originPick.originDraft}
                onOriginPick={originPick.onOriginMapPick}
                panTo={routeTravel.panTarget ?? originPick.panTo}
                panTick={routeTravel.panTick > 0 ? routeTravel.panTick : originPick.panTick}
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
              {routeMode &&
              activeRoute &&
              !originPick.originPickActive &&
              view === "map" &&
              !routeTravel.started &&
              activeRoute.stops.length > 0 ? (
                <div className="route-map-start-bar" dir="rtl">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full bg-emerald-500 text-lg font-bold text-black hover:bg-emerald-400"
                    onClick={routeTravel.startTravel}
                  >
                    התחלה — יוצאים לדרך
                  </Button>
                </div>
              ) : null}
              {routeMode && activeRoute && !originPick.originPickActive && view === "map" ? (
                <RouteStartCard
                  label={
                    activeRoute.originLabel ||
                    (activeRoute.startedFrom === "gps" ? "מיקום נוכחי" : "ממרכז השכונה")
                  }
                  started={routeTravel.started}
                  stopCount={activeRoute.stops.length}
                  onStart={routeTravel.startTravel}
                  onChangeOrigin={() => originPick.setOriginPickerOpen(true)}
                />
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
              {houseDetailCommon && view === "map" && !originPick.originPickActive ? (
                <MapHouseSheet
                  {...houseDetailCommon}
                  filterMismatchReasons={selectedFilterReasons}
                  onShowInList={
                    selected && matchedIds.has(selected.id)
                      ? () => {
                          selection.showInListFromMap(selected.id);
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
                {routeMode && !routeTravel.started && activeRoute && activeRoute.stops.length > 0 ? (
                  <div className="route-list-start-bar" dir="rtl">
                    <Button
                      type="button"
                      size="lg"
                      className="w-full bg-emerald-500 text-lg font-bold text-black hover:bg-emerald-400"
                      onClick={routeTravel.startTravel}
                    >
                      התחלה — יוצאים לדרך
                    </Button>
                  </div>
                ) : null}
                {routeMode ? (
                  <RouteList
                    route={activeRoute}
                    hasGps={Boolean(gps)}
                    onRequestLocation={gpsAllowed ? originPick.chooseGpsOrigin : undefined}
                    onChangeOrigin={() => originPick.setOriginPickerOpen(true)}
                    onStartTravel={routeTravel.startTravel}
                    travelStarted={routeTravel.started}
                    travelCompletedCount={routeTravel.completedCount}
                    travelSweepIndex={routeTravel.sweepIndex}
                    travelLineReveal={routeTravel.lineReveal}
                    stopTravelState={routeTravel.stopState}
                    onSkipStop={handleSkipRouteStop}
                    travelAnimating={routeTravelAnimating}
                    selectedId={selection.selected?.id ?? null}
                    catalogSource={source}
                    likedIds={likes.likedIds}
                    onToggleLike={onToggleLike}
                    visitedIds={visits.visitedIds}
                    onToggleVisited={handleToggleVisited}
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
                    onToggleVisited={handleToggleVisited}
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
                    editingId={null}
                  />
                )}
            </div>
          </>
        )}
        {houseDetailCommon && view === "list" && !originPick.originPickActive && !editFlow.flow ? (
          <HouseDetailOverlay
            {...houseDetailCommon}
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
      <RouteConfirmDialog
        open={Boolean(routePrompt)}
        title={routePrompt?.title ?? ""}
        description={routePrompt?.description ?? ""}
        removedHouses={routePrompt?.removedHouses}
        addedHouses={routePrompt?.addedHouses}
        promptKind={routePrompt?.kind ?? "enter-route"}
        confirmLabel={routePrompt?.confirmLabel ?? "המשך"}
        onConfirm={(includeNew) => {
          routePrompt?.onConfirm(includeNew);
          setRoutePrompt(null);
        }}
        onCancel={() => setRoutePrompt(null)}
      />
      <VisitCheer show={visitCheer} />
      <RouteCompleteOverlay
        show={routeMode && routeTravel.showComplete}
        stopCount={activeRoute?.stops.length ?? 0}
        onDismiss={routeTravel.dismissComplete}
      />
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
