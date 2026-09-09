"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Heart, List, MapPinned, Route } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { Input } from "@/components/ui/input";
import { PingPongMarquee } from "@/components/neighborhood-marquee";
import { FilterTrigger, FiltersSheet } from "@/components/filter-menu";
import {
  HouseFiltersContent,
  houseFiltersDraftInvalid,
} from "@/components/house-filters-content";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { HouseList } from "@/components/house-list";
import { MapStats, StatsSummary } from "@/components/map-stats";
import { CsvExportButton } from "@/components/csv-export-button";
import { MapHouseSheet } from "@/components/map-house-sheet";
import { NightDesk } from "@/components/night-desk";
import { OriginPickerSheet, OriginTrigger } from "@/components/origin-picker";
import { RouteList } from "@/components/route-list";
import { RouteConfirmDialog } from "@/components/route-confirm-dialog";
import { reversePin } from "@/components/address-field";
import { useRouteGeometry } from "@/hooks/use-route-geometry";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useAdminHouses } from "@/hooks/use-admin-houses";
import { useFilterDraft } from "@/hooks/use-filter-draft";
import { useHouseFilters, countActiveFilters } from "@/hooks/use-house-filters";
import { useMergedHouses } from "@/hooks/use-merged-houses";
import { useNeighborhoodRoute } from "@/hooks/use-neighborhood-route";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { useUserLocation } from "@/hooks/use-user-location";
import { useVisitedHouses } from "@/hooks/use-visited-houses";
import { useDistanceOrigin } from "@/hooks/use-distance-origin";
import { useHouseSet } from "@/hooks/use-house-set";
import { inNeighborhood, config } from "@/lib/config";
import { clusterHousesByAddress } from "@/lib/house-clusters";
import { applyClockSearchParams } from "@/lib/app-clock";
import { useAppNow } from "@/hooks/use-app-clock";
import { reportHouseTraffic } from "@/hooks/use-house-traffic";
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
import { UnvisitedSign } from "@/components/visit-marks";
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
  const [selectedId, setSelectedId] = useState<string | "closed" | null>(focusId);
  const [selectedListIndex, setSelectedListIndex] = useState<number | undefined>();
  const [focusSeen, setFocusSeen] = useState(focusId);
  const [clusterOverview, setClusterOverview] = useState(false);
  const [expandedClusterKey, setExpandedClusterKey] = useState<string | null>(null);

  useEffect(() => {
    if (!focusId || focusId === focusSeen) return;
    setFocusSeen(focusId);
    setSelectedId(focusId);
    setClusterOverview(false);
    setExpandedClusterKey(null);
  }, [focusId, focusSeen]);
  const {
    filters,
    update: updateFilters,
  } = useHouseFilters();
  const toggleLikedFilter = () => updateFilters({ likedOnly: !filters.likedOnly });
  const toggleUnvisitedFilter = () =>
    updateFilters({ unvisitedOnly: !filters.unvisitedOnly });
  const { accessibleOnly, likedOnly, unvisitedOnly } = filters;
  const originPickResumeView = useRef<HomeView | null>(null);
  const geoErrorToasted = useRef(false);
  const cheerTimer = useRef(0);
  const outsideBannerTimer = useRef(0);
  const outsideBannerFor = useRef(0);
  const [visitCheer, setVisitCheer] = useState(false);
  const [outsideBanner, setOutsideBanner] = useState(false);
  const [askedLocation, setAskedLocation] = useState(false);
  const [originPickerOpen, setOriginPickerOpen] = useState(false);
  const [originPickActive, setOriginPickActive] = useState(false);
  const [originDraft, setOriginDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [originDraftLabel, setOriginDraftLabel] = useState("נקודה במפה");
  const [panTo, setPanTo] = useState<{ lat: number; lng: number } | null>(null);
  const [panTick, setPanTick] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editForId, setEditForId] = useState(selectedId);

  useEffect(() => {
    if (selectedId === editForId) return;
    setEditForId(selectedId);
    setEditing(false);
  }, [selectedId, editForId]);
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

  useEffect(
    () => () => {
      window.clearTimeout(cheerTimer.current);
      window.clearTimeout(outsideBannerTimer.current);
    },
    [],
  );
  useEffect(() => {
    applyClockSearchParams(window.location.search);
  }, []);

  function setView(next: HomeView) {
    writeHomeView(next);
  }

  const editHouseId = selectedId === "closed" ? null : (selectedId ?? focusId);
  const ownedEditCode = useMemo(() => {
    if (!editHouseId) return undefined;
    return owned.find((item) => item.id === editHouseId)?.editCode;
  }, [owned, editHouseId]);
  const canEditSelected = Boolean(admin || ownedEditCode);

  const {
    adminHouses,
    busyAction,
    applyAdminHouse,
    approveHouse,
    rejectHouse,
    removeAdminHouse,
  } = useAdminHouses({ admin, refresh });

  useEffect(() => {
    if (!admin) setEditing(false);
  }, [admin]);

  const wasAdmin = useRef(false);
  useEffect(() => {
    if (wasAdmin.current && !admin) {
      setSelectedId("closed");
      setClusterOverview(false);
      setExpandedClusterKey(null);
      void refresh(true);
    }
    wasAdmin.current = admin;
  }, [admin, refresh]);

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
    onBeforeEnter: () => {
      setSelectedId("closed");
      setClusterOverview(false);
      setExpandedClusterKey(null);
      setEditing(false);
    },
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

  useEffect(() => {
    if (gpsAllowed || originChoice.kind !== "gps") return;
    setOriginChoice({ kind: "neighborhood" });
  }, [gpsAllowed, originChoice.kind, setOriginChoice]);

  useEffect(() => {
    if (!originPickActive || !originDraft) return;
    let cancelled = false;
    void reversePin(originDraft.lat, originDraft.lng).then((hit) => {
      if (!cancelled && hit?.label) setOriginDraftLabel(hit.label);
    });
    return () => {
      cancelled = true;
    };
  }, [originPickActive, originDraft]);

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

  const activeId = selectedId === "closed" ? null : (selectedId ?? focusId);
  const selected =
    visible.find((house) => house.id === activeId) ??
    houses.find((house) => house.id === activeId) ??
    null;
  const selectedCluster = useMemo(() => {
    if (!selected) return [];
    const cluster = clusterHousesByAddress(visible).find((item) =>
      item.houses.some((house) => house.id === selected.id),
    );
    return cluster?.houses ?? [selected];
  }, [selected, visible]);
  const geoError =
    askedLocation && (geo.status === "denied" || geo.status === "error" || geo.status === "unavailable");
  const outsideNeighborhood = Boolean(
    gps && askedLocation && panTick > 0 && !inNeighborhood(gps.lat, gps.lng),
  );
  const routeTicker = originPickActive ? "לחצו על המפה כדי לקבוע נקודת התחלה" : null;

  useEffect(() => {
    if (!outsideNeighborhood) {
      setOutsideBanner(false);
      return;
    }
    if (outsideBannerFor.current === panTick) return;
    outsideBannerFor.current = panTick;
    setOutsideBanner(true);
    window.clearTimeout(outsideBannerTimer.current);
    outsideBannerTimer.current = window.setTimeout(() => setOutsideBanner(false), 4000);
    return () => window.clearTimeout(outsideBannerTimer.current);
  }, [outsideNeighborhood, panTick]);

  useEffect(() => {
    if (!geoError) {
      geoErrorToasted.current = false;
      return;
    }
    if (pendingRouteGps.current) {
      pendingRouteGps.current = false;
      pinCurrentRoute(true);
    }
    if (geoErrorToasted.current) return;
    geoErrorToasted.current = true;
    toast.warning("לא הצלחנו לקרוא מיקום. אשרו גישה למיקום בהגדרות.");
  }, [geoError, pinCurrentRoute]);

  function panMapTo(point: { lat: number; lng: number }) {
    setPanTo(point);
    setPanTick((n) => n + 1);
  }

  function goToMyLocation() {
    setAskedLocation(true);
    geo.refresh();
    if (originPickActive) {
      if (gps) {
        setOriginDraft({ lat: gps.lat, lng: gps.lng });
        setOriginDraftLabel("המיקום שלכם");
      }
      return;
    }
    if (gps) panMapTo(gps);
  }

  function exitOriginPick() {
    setOriginPickActive(false);
    setOriginDraft(null);
    const resume = originPickResumeView.current;
    originPickResumeView.current = null;
    if (resume === "list") setView("list");
  }

  function enterRouteMode() {
    exitOriginPick();
    startRouteMode();
  }

  function goHome() {
    exitOriginPick();
    exitRouteMode();
    setSelectedId("closed");
    setClusterOverview(false);
    setExpandedClusterKey(null);
    setEditing(false);
  }

  function chooseGpsOrigin() {
    setOriginPickerOpen(false);
    exitOriginPick();
    setOriginChoice({ kind: "gps" });
    setAskedLocation(true);
    geo.refresh();
    if (gps) panMapTo(gps);
  }

  function chooseNeighborhoodOrigin() {
    setOriginPickerOpen(false);
    exitOriginPick();
    setOriginChoice({ kind: "neighborhood" });
    if (view === "map") panMapTo({ lat: config.map.center.lat, lng: config.map.center.lng });
  }

  function chooseCustomOrigin(lat: number, lng: number, label: string) {
    setOriginPickerOpen(false);
    exitOriginPick();
    setOriginChoice({ kind: "custom", lat, lng, label });
    if (view === "map") panMapTo({ lat, lng });
  }

  function startOriginPick() {
    setOriginPickerOpen(false);
    originPickResumeView.current = view;
    setView("map");
    setSelectedId("closed");
    setClusterOverview(false);
    setExpandedClusterKey(null);
    setEditing(false);
    setOriginDraft({ lat: origin.lat, lng: origin.lng });
    setOriginDraftLabel(origin.kind === "custom" ? origin.label : "נקודה במפה");
    setOriginPickActive(true);
  }

  async function saveOriginPick() {
    if (!originDraft) return;
    let label = originDraftLabel;
    try {
      const hit = await reversePin(originDraft.lat, originDraft.lng);
      if (hit?.label) label = hit.label;
    } catch {
      /* keep draft label */
    }
    setOriginChoice({ kind: "custom", lat: originDraft.lat, lng: originDraft.lng, label });
    exitOriginPick();
  }

  function onToggleLike(id: string) {
    const nextOn = !likes.liked(id);
    reportHouseTraffic(id, "saved", nextOn);
    likes.toggle(id);
  }

  function onToggleVisited(id: string) {
    const nextOn = !visits.visited(id);
    reportHouseTraffic(id, "visited", nextOn);
    const ids = visits.toggle(id);
    const marking = ids.includes(id);
    if (!marking) return;
    setVisitCheer(false);
    window.clearTimeout(cheerTimer.current);
    window.requestAnimationFrame(() => {
      setVisitCheer(true);
      cheerTimer.current = window.setTimeout(() => setVisitCheer(false), 1600);
    });
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
    if (selectedId === id) {
      setSelectedId("closed");
      setClusterOverview(false);
      setEditing(false);
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
        {selected ? `נבחר: ${selected.name}` : ""}
      </div>
      <div
        className="app-toolbar relative z-40 border-b border-orange-500/15 bg-[#12081a]/80 px-3 py-2"
        style={{ flexShrink: 0 }}
      >
        <div className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden">
          <div className="flex min-w-0 shrink rounded-xl bg-[#261536] p-0.5 ring-1 ring-orange-400/40">
            <Toggle
              active={view === "map"}
              onClick={() => setView("map")}
              icon={<MapPinned className="size-4" />}
              label="מפה"
            />
            <Toggle
              active={view === "list"}
              onClick={() => {
                setView("list");
                setSelectedId("closed");
                setClusterOverview(false);
                setEditing(false);
              }}
              icon={<List className="size-4" />}
              label="רשימה"
            />
          </div>
          <button
            type="button"
            aria-label={likedOnly ? "מציגים שמורים בלבד" : "סינון שמורים"}
            aria-pressed={likedOnly}
            onClick={toggleLikedFilter}
            className={cn(
              "relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
              likedOnly
                ? "bg-orange-500 text-black"
                : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25",
            )}
          >
            <Heart className={cn("size-4", likedOnly && "fill-current")} />
          </button>
          <button
            type="button"
            aria-label={unvisitedOnly ? "מציגים לא ביקרתי בלבד" : "סינון לא ביקרתי"}
            aria-pressed={unvisitedOnly}
            onClick={toggleUnvisitedFilter}
            className={cn(
              "relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
              unvisitedOnly
                ? "bg-orange-500 text-black"
                : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25",
            )}
          >
            <UnvisitedSign className="size-4" />
          </button>
          <FilterTrigger activeCount={activeFilterCount} onClick={() => setFiltersOpen(true)} />
          <OriginTrigger
            shifted={originChoice.kind !== "gps"}
            onClick={() => setOriginPickerOpen(true)}
          />
          <button
            type="button"
            aria-label={routeMode ? "יציאה מהמסלול" : "מסלול"}
            aria-pressed={routeMode}
            onClick={() => (routeMode ? exitRouteMode() : enterRouteMode())}
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
              routeMode
                ? "bg-orange-500 text-black"
                : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25",
            )}
          >
            <Route className="size-4" />
          </button>
          <CsvExportButton houses={visible} kind={likedOnly ? "liked" : "list"} includeTraffic={admin} />
        </div>
        {routeTicker ? <StatusTicker text={routeTicker} /> : null}
        {view === "list" && !routeMode ? (
          <div className="mt-2 w-full min-w-0">
            <Input
              id="house-search"
              type="search"
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
              placeholder="חיפוש לפי שם או רחוב…"
              aria-label="חיפוש בית"
              autoComplete="off"
              enterKeyHint="search"
              className="h-10 w-full min-w-0 bg-[#1d1028] text-base"
            />
          </div>
        ) : null}
      </div>
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
      {outsideBanner ? (
        <div
          role="status"
          className="relative z-30 bg-amber-950 px-3 py-2 text-center text-base text-amber-50"
        >
          המיקום שלכם מחוץ למפת השכונה — סימנו את הקצה הקרוב.
        </div>
      ) : null}
      {offline || unreachable ? (
        <div className="relative z-30 bg-[#2a1638] px-3 py-2 text-center text-base text-amber-100 ring-1 ring-inset ring-amber-500/20">
          {offline
            ? houses.length > 0
              ? "אין אינטרנט · מוצגת הרשימה ששמורה בטלפון"
              : "אין אינטרנט, ואין עותק שמור בטלפון"
            : houses.length > 0
              ? "השרת לא עונה · מוצגת הרשימה ששמורה בטלפון"
              : "השרת לא עונה, ואין עותק שמור בטלפון"}
        </div>
      ) : error ? (
        <div className="relative z-30 bg-red-950/70 px-3 py-2 text-center text-base text-red-100">
          {error}
        </div>
      ) : null}
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
                selectedId={originPickActive ? null : selected?.id}
                clusterOverview={clusterOverview}
                expandedClusterKey={expandedClusterKey}
                onSelect={(house, opts) => {
                  if (originPickActive) return;
                  const cluster = clusterHousesByAddress(visible).find((item) =>
                    item.houses.some((itemHouse) => itemHouse.id === house.id),
                  );
                  const isMulti = (cluster?.houses.length ?? 0) > 1;
                  if (opts?.clusterOverview) {
                    setExpandedClusterKey(cluster?.key ?? null);
                    setClusterOverview(true);
                  } else if (isMulti) {
                    setExpandedClusterKey(cluster?.key ?? null);
                    setClusterOverview(false);
                  } else {
                    setExpandedClusterKey(null);
                    setClusterOverview(false);
                  }
                  setSelectedListIndex(undefined);
                  setSelectedId(house.id);
                }}
                onClose={() => {
                  setClusterOverview(false);
                  setSelectedId("closed");
                }}
                onCollapseCluster={() => {
                  setExpandedClusterKey(null);
                  setClusterOverview(false);
                  setSelectedId("closed");
                }}
                className="h-full w-full"
                active={view === "map"}
                userLocation={gps}
                locating={geo.status === "pending" && askedLocation}
                onLocate={goToMyLocation}
                routeLine={routeMode && !originPickActive ? routeLine : null}
                routeFitTick={routeMode && !originPickActive ? routeFitTick : 0}
                routeStart={routeMode ? origin : null}
                visitedIds={visits.visitedIds}
                originMarker={origin.fromGps ? null : origin}
                originPickActive={originPickActive}
                originPick={originDraft}
                onOriginPick={(lat, lng) => {
                  setOriginDraft({ lat, lng });
                  setOriginDraftLabel("נקודה במפה");
                }}
                panTo={panTo}
                panTick={panTick}
                statsFab={
                  originPickActive ? null : (
                    <MapStats {...summaryProps} />
                  )
                }
                routeStops={
                  routeMode && walkingRoute && !originPickActive
                    ? walkingRoute.stops.map((stop) => ({
                        id: stop.house.id,
                        order: stop.order,
                        lat: stop.house.lat,
                        lng: stop.house.lng,
                      }))
                    : null
                }
              />
              {originPickActive ? (
                <div className="origin-pick-bar">
                  <p className="origin-pick-label">{originDraftLabel}</p>
                  <div className="origin-pick-actions">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-orange-500 text-black hover:bg-orange-400"
                      disabled={!originDraft}
                      onClick={() => void saveOriginPick()}
                    >
                      שמירת התחלה
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={exitOriginPick}>
                      ביטול
                    </Button>
                  </div>
                </div>
              ) : null}
              <CatalogMetaChip
                hidden={Boolean(selected) && !originPickActive}
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
                    onRequestLocation={gpsAllowed ? chooseGpsOrigin : undefined}
                    onChangeOrigin={() => setOriginPickerOpen(true)}
                    selectedId={selected?.id ?? null}
                    catalogSource={source}
                    likedIds={likes.likedIds}
                    onToggleLike={onToggleLike}
                    visitedIds={visits.visitedIds}
                    onToggleVisited={onToggleVisited}
                    admin={admin}
                    canEditHouse={(id) => Boolean(admin || owned.some((item) => item.id === id))}
                    onShowOnMap={(id) => {
                      setView("map");
                      setClusterOverview(false);
                      setExpandedClusterKey(null);
                      setEditing(false);
                      setSelectedListIndex(undefined);
                      setSelectedId(id);
                    }}
                    onSelectHouse={(id, index) => {
                      setClusterOverview(false);
                      setSelectedListIndex(index);
                      setSelectedId(id);
                    }}
                    onEditHouse={(id, index) => {
                      setClusterOverview(false);
                      setEditForId(id);
                      setSelectedListIndex(index);
                      setSelectedId(id);
                      setEditing(true);
                    }}
                    editingId={editing ? selected?.id ?? null : null}
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
                    onShowOnMap={(id) => {
                      setView("map");
                      setClusterOverview(false);
                      setExpandedClusterKey(null);
                      setEditing(false);
                      setSelectedListIndex(undefined);
                      setSelectedId(id);
                    }}
                    onSelectHouse={(id, index) => {
                      setClusterOverview(false);
                      setSelectedListIndex(index);
                      setSelectedId(id);
                    }}
                    onEditHouse={(id, index) => {
                      setClusterOverview(false);
                      setEditForId(id);
                      setSelectedListIndex(index);
                      setSelectedId(id);
                      setEditing(true);
                    }}
                    selectedId={selected?.id ?? null}
                    editingId={editing ? selected?.id ?? null : null}
                  />
                )}
            </div>
          </>
        )}
        {selected && view === "list" && !originPickActive ? (
          <button
            type="button"
            aria-label="סגירת פרטי הבית"
            className="absolute inset-0 z-40 bg-black/40"
            onClick={() => {
              setEditing(false);
              setClusterOverview(false);
              setSelectedId("closed");
            }}
          />
        ) : null}
        {selected && !originPickActive ? (
        <MapHouseSheet
          house={selected}
          clusterHouses={view === "map" ? selectedCluster : [selected]}
          clusterOverview={view === "map" && clusterOverview}
          index={view === "list" ? selectedListIndex : undefined}
          onClose={() => {
            setClusterOverview(false);
            setSelectedId("closed");
          }}
          liked={likes.liked}
          onToggleLike={onToggleLike}
          visited={visits.visited}
          onToggleVisited={onToggleVisited}
          catalogSource={source}
          managerEditCode={admin ? editCodeById.get(selected.id) : undefined}
          editCodeFor={(id) =>
            admin ? editCodeById.get(id) : owned.find((item) => item.id === id)?.editCode
          }
          canEditHouse={(id) => Boolean(admin || owned.some((item) => item.id === id))}
          editing={editing}
          onToggleEdit={() => setEditing((v) => !v)}
          onShowOnMap={
            view === "list"
              ? () => {
                  setView("map");
                  setClusterOverview(false);
                  setExpandedClusterKey(null);
                }
              : undefined
          }
          onShowInList={
            view === "map" && selected
              ? () => {
                  const index = visible.findIndex((house) => house.id === selected.id);
                  setView("list");
                  setClusterOverview(false);
                  setExpandedClusterKey(null);
                  setSelectedListIndex(index >= 0 ? index + 1 : undefined);
                }
              : undefined
          }
          pendingNote={
            selected.status === "pending" ? (
              <p className="mb-3 rounded-lg bg-violet-950/70 px-3 py-2 text-base text-violet-100">
                {admin
                  ? "בית ממתין לאישור — עדיין לא במפה הציבורית."
                  : "הבית הזה עדיין לא במפה הציבורית. אם זה הבית שלכם, מנהל יכול לאשר אותו."}
              </p>
            ) : null
          }
          extra={
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
                        setSelectedId("closed");
                        setClusterOverview(false);
                      });
                    }}
                  >
                    דחייה ומחיקה
                  </Button>
                </div>
              ) : null}
              {editing && canEditSelected ? (
                <NightDesk
                  house={selected}
                  admin={admin}
                  allowDelete
                  editCode={admin ? editCodeById.get(selected.id) : ownedEditCode}
                  onCancel={() => setEditing(false)}
                  onDeleted={() => handleHouseDeleted(selected.id)}
                  onUpdated={handleHouseUpdated}
                />
              ) : null}
            </div>
          }
        />
        ) : null}
      </main>
      <OriginPickerSheet
        open={originPickerOpen}
        onOpenChange={setOriginPickerOpen}
        choice={originChoice}
        gpsAllowed={gpsAllowed}
        onChooseGps={chooseGpsOrigin}
        onChooseNeighborhood={chooseNeighborhoodOrigin}
        onChooseCustom={chooseCustomOrigin}
        onPickOnMap={startOriginPick}
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
      {visitCheer ? (
        <div className="visit-cheer" role="status" aria-live="polite">
          <div className="visit-cheer-card">
            <span className="visit-cheer-burst" aria-hidden="true">
              <i /><i /><i /><i /><i /><i />
            </span>
            <span className="visit-cheer-check" aria-hidden="true" />
            כל הכבוד!
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusTicker({ text }: { text: string }) {
  return (
    <div className="mt-1 flex min-w-0 items-center">
      <PingPongMarquee text={text} className="flex-1 text-base text-orange-100" />
    </div>
  );
}

function CatalogMetaChip({
  hidden = false,
  houseSetLabel,
}: {
  hidden?: boolean;
  houseSetLabel?: string | null;
}) {
  if (!houseSetLabel) return null;
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-2 start-2 z-10 max-w-[min(calc(100%-1rem),12rem)] transition-[opacity,transform] duration-[220ms] ease-out motion-reduce:transition-none",
        hidden ? "-translate-y-2 opacity-0" : "translate-y-0 opacity-100",
      )}
      aria-hidden={hidden}
    >
      <span className="inline-block max-w-full rounded-lg bg-[#12081a]/90 px-2 py-1 text-base text-violet-200 ring-1 ring-orange-500/25 backdrop-blur-sm">
        {houseSetLabel}
      </span>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg",
        active ? "bg-orange-500 text-black" : "text-violet-200",
      )}
    >
      {icon}
    </button>
  );
}
