"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AppHeader } from "@/components/app-header";
import { CatalogMetaChip } from "@/components/catalog-meta-chip";
import { FiltersSheet } from "@/components/filter-menu";
import { HouseFiltersContent } from "@/components/house-filters-content";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { HouseList } from "@/components/house-list";
import { MapStats, StatsSummary } from "@/components/map-stats";
import { MapHouseSheet } from "@/components/map-house-sheet";
import { NightDesk } from "@/components/night-desk";
import { NeighborhoodStatusBanners } from "@/components/neighborhood-status-banners";
import { NeighborhoodToolbar } from "@/components/neighborhood-toolbar";
import { OriginPickerSheet } from "@/components/origin-picker";
import { RouteList } from "@/components/route-list";
import { RouteConfirmDialog } from "@/components/route-confirm-dialog";
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
import { HOUSE_SET_LABELS } from "@/lib/house-set";
import { filterHouses } from "@/lib/filter-houses";
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
  const toggleLikedFilter = () => updateFilters({ likedOnly: !filters.likedOnly });
  const toggleUnvisitedFilter = () =>
    updateFilters({ unvisitedOnly: !filters.unvisitedOnly });
  const { accessibleOnly, likedOnly, unvisitedOnly } = filters;

  const [askedLocation, setAskedLocation] = useState(false);
  const [listQuery, setListQuery] = useState("");
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
  useEffect(() => {
    if (!focusId) return;
    writeHomeView("map");
  }, [focusId]);

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

  const visible = useMemo(() => filterHouses(houses, filters, filterContext), [houses, filters, filterContext]);
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const selection = useHouseSelection({ focusId, visible, houses });
  const { setEditing: setHouseEditing, resetForNavigation } = selection;

  useEffect(() => {
    if (!admin) setHouseEditing(false);
  }, [admin, setHouseEditing]);

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
    setRoutePrompt,
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
  const { line: routeLine } = useRouteGeometry(walkingRoute, routeMode);
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
    selection.resetForNavigation();
  }

  function handleHouseUpdated(next: PublicHouse) {
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

  function handleHouseDeleted(id: string) {
    removeAdminHouse(id);
    removeOwnedHouse(id);
    forgetPublishedHouse(id);
    if (selection.selectedId === id) {
      selection.closeSelection();
    }
    notifyCatalogChanged();
    void refresh(true);
  }

  return (
    <div
      id="neighborhood-shell"
      className="relative isolate flex flex-col overflow-hidden"
      style={{ display: "flex", flexDirection: "column", height: "var(--app-h, 100svh)", overflow: "hidden" }}
    >
      <AppHeader onHomeTap={goHome} />
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selection.selected ? `נבחר: ${selection.selected.name}` : ""}
      </div>
      <NeighborhoodToolbar
        view={view}
        onViewChange={setView}
        onListView={() => {
          setView("list");
          selection.closeSelection();
        }}
        likedOnly={likedOnly}
        unvisitedOnly={unvisitedOnly}
        onToggleLikedFilter={toggleLikedFilter}
        onToggleUnvisitedFilter={toggleUnvisitedFilter}
        activeFilterCount={activeFilterCount}
        onOpenFilters={() => setFiltersOpen(true)}
        originShifted={originChoice.kind !== "gps"}
        onOpenOriginPicker={() => originPick.setOriginPickerOpen(true)}
        routeMode={routeMode}
        onToggleRoute={() => (routeMode ? exitRouteMode() : enterRouteMode())}
        houses={visible}
        includeTraffic={admin}
        listQuery={listQuery}
        onListQueryChange={setListQuery}
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
                view !== "map" && "invisible pointer-events-none",
              )}
              style={{ position: "absolute", inset: 0 }}
              aria-hidden={view !== "map"}
            >
              <HouseMapDynamic
                houses={visible}
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
                visitedIds={visits.visitedIds}
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
                  routeMode && walkingRoute && !originPick.originPickActive
                    ? walkingRoute.stops.map((stop) => ({
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
              <CatalogMetaChip
                hidden={Boolean(selection.selected) && !originPick.originPickActive}
                houseSetLabel={admin ? HOUSE_SET_LABELS[activeHouseSet] : null}
              />
            </div>
            <div
              className={cn(
                "absolute inset-0 overflow-y-auto bg-[#12081a]",
                view === "list" ? "z-10" : "invisible pointer-events-none z-0",
              )}
              style={{ position: "absolute", inset: 0, overflowY: "auto", background: "#12081a" }}
              aria-hidden={view !== "list"}
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
                    route={walkingRoute}
                    hasGps={Boolean(gps)}
                    onRequestLocation={gpsAllowed ? originPick.chooseGpsOrigin : undefined}
                    onChangeOrigin={() => originPick.setOriginPickerOpen(true)}
                    selectedId={selection.selected?.id ?? null}
                    catalogSource={source}
                    likedIds={likes.likedIds}
                    onToggleLike={onToggleLike}
                    visitedIds={visits.visitedIds}
                    onToggleVisited={onToggleVisited}
                    admin={admin}
                    canEditHouse={(id) => Boolean(admin || owned.some((item) => item.id === id))}
                    onShowOnMap={selection.showOnMap}
                    onSelectHouse={selection.selectInList}
                    onEditHouse={selection.editInList}
                    editingId={selection.editing ? selection.selected?.id ?? null : null}
                  />
                ) : (
                  <HouseList
                    houses={visible}
                    query={listQuery}
                    origin={origin}
                    catalogSource={source}
                    likedIds={likes.likedIds}
                    onToggleLike={onToggleLike}
                    visitedIds={visits.visitedIds}
                    onToggleVisited={onToggleVisited}
                    admin={admin}
                    canEditHouse={(id) => Boolean(admin || owned.some((item) => item.id === id))}
                    onShowOnMap={selection.showOnMap}
                    onSelectHouse={selection.selectInList}
                    onEditHouse={selection.editInList}
                    selectedId={selection.selected?.id ?? null}
                    editingId={selection.editing ? selection.selected?.id ?? null : null}
                  />
                )}
            </div>
          </>
        )}
        {selection.selected && view === "list" && !originPick.originPickActive ? (
          <button
            type="button"
            aria-label="סגירת פרטי הבית"
            className="absolute inset-0 z-40 bg-black/40"
            onClick={selection.dismissForOverlay}
          />
        ) : null}
        {selection.selected && !originPick.originPickActive ? (
        <MapHouseSheet
          house={selection.selected}
          clusterHouses={view === "map" ? selection.selectedCluster : [selection.selected]}
          clusterOverview={view === "map" && selection.clusterOverview}
          index={view === "list" ? selection.selectedListIndex : undefined}
          onClose={selection.closeSelection}
          liked={likes.liked}
          onToggleLike={onToggleLike}
          visited={visits.visited}
          onToggleVisited={onToggleVisited}
          catalogSource={source}
          managerEditCode={admin ? editCodeById.get(selection.selected.id) : undefined}
          editCodeFor={(id) =>
            admin ? editCodeById.get(id) : owned.find((item) => item.id === id)?.editCode
          }
          canEditHouse={(id) => Boolean(admin || owned.some((item) => item.id === id))}
          editing={selection.editing}
          onToggleEdit={() => selection.setEditing((v) => !v)}
          onShowOnMap={
            view === "list"
              ? () => {
                  setView("map");
                  selection.clearCluster();
                }
              : undefined
          }
          onShowInList={
            view === "map" && selection.selected
              ? () => {
                  selection.showInListFromMap(selection.selected!.id);
                  setView("list");
                }
              : undefined
          }
          pendingNote={
            selection.selected.status === "pending" ? (
              <p className="mb-3 rounded-lg bg-violet-950/70 px-3 py-2 text-base text-violet-100">
                {admin
                  ? "בית ממתין לאישור — עדיין לא במפה הציבורית."
                  : "הבית הזה עדיין לא במפה הציבורית. אם זה הבית שלכם, מנהל יכול לאשר אותו."}
              </p>
            ) : null
          }
          extra={
            <div className="mt-4 space-y-3">
              {admin && selection.selected.status === "pending" ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="bg-emerald-600 text-white hover:bg-emerald-500"
                    disabled={busyAction}
                    onClick={() => void approveHouse(selection.selected!.id)}
                  >
                    אישור למפה
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={busyAction}
                    onClick={() => {
                      void rejectHouse(selection.selected!.id).then((ok) => {
                        if (!ok) return;
                        selection.closeSelection();
                      });
                    }}
                  >
                    דחייה ומחיקה
                  </Button>
                </div>
              ) : null}
              {selection.editing && canEditSelected ? (
                <NightDesk
                  house={selection.selected}
                  admin={admin}
                  allowDelete
                  editCode={admin ? editCodeById.get(selection.selected.id) : ownedEditCode}
                  onCancel={() => selection.setEditing(false)}
                  onDeleted={() => handleHouseDeleted(selection.selected!.id)}
                  onUpdated={handleHouseUpdated}
                />
              ) : null}
            </div>
          }
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
    </div>
  );
}
