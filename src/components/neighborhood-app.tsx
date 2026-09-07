"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { List, MapPinned, Route, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { PingPongMarquee } from "@/components/neighborhood-marquee";
import {
  FilterOption,
  FilterSection,
  FilterTrigger,
  FiltersSheet,
} from "@/components/filter-menu";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { HouseList } from "@/components/house-list";
import { CsvExportButton } from "@/components/csv-export-button";
import { MapHouseSheet } from "@/components/map-house-sheet";
import { NightDesk } from "@/components/night-desk";
import { OriginPickerSheet, OriginTrigger } from "@/components/origin-picker";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { RouteList } from "@/components/route-list";
import { reversePin } from "@/components/address-field";
import { useRouteGeometry } from "@/hooks/use-route-geometry";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useHouseFilters } from "@/hooks/use-house-filters";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { useUserLocation } from "@/hooks/use-user-location";
import { useVisitedHouses } from "@/hooks/use-visited-houses";
import { useDistanceOrigin } from "@/hooks/use-distance-origin";
import { useHouseSet } from "@/hooks/use-house-set";
import { readApiJson } from "@/lib/api-json";
import { houseInNeighborhoods, inNeighborhood, NEIGHBORHOODS, config } from "@/lib/config";
import { clusterHousesByAddress } from "@/lib/house-clusters";
import { toPublicHouse } from "@/lib/ids";
import { offersCandy, offersSensitivity, isDecorated } from "@/lib/house-state";
import { AccessibleMark } from "@/components/symbols";
import { CandyMark } from "@/components/candy-glyphs";
import { SensitivityMark } from "@/components/sensitivity-glyphs";
import { OpenNowMark } from "@/components/open-now-mark";
import { LikedMark, UnvisitedMark } from "@/components/visit-marks";
import { ScareMark, ScareSign } from "@/components/scare-glyphs";
import { isOpenNow } from "@/lib/hours";
import { applyClockSearchParams } from "@/lib/app-clock";
import { useAppNow } from "@/hooks/use-app-clock";
import { reportHouseTraffic } from "@/hooks/use-house-traffic";
import { useOnlineDevices } from "@/hooks/use-presence";
import {
  backupLooksNewer,
  loadPendingWrites,
  loadServerDbBackup,
  notifyCatalogChanged,
  removeOwnedHouse,
  saveOwnedHouse,
  saveServerDbBackup,
  type ServerDbBackup,
} from "@/lib/offline-db";
import { decorShort } from "@/lib/labels";
import { readHomeView, writeHomeView, type HomeView } from "@/lib/home-view";
import { HOUSE_SET_LABELS, HOUSE_SET_STATUS, houseMatchesSet } from "@/lib/house-set";
import { buildWalkingRoute, type WalkingRoute } from "@/lib/route";
import type { Catalog, House, PublicHouse, ScareLevel, SensitivityId } from "@/lib/types";
import { SCARE_LEVELS, SENSITIVITY_OPTIONS } from "@/lib/types";
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
  const view = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("hw-home-view", onStoreChange);
      return () => window.removeEventListener("hw-home-view", onStoreChange);
    },
    readHomeView,
    () => "map" as HomeView,
  );
  const [selectedId, setSelectedId] = useState<string | "closed" | null>(focusId);
  const [focusSeen, setFocusSeen] = useState(focusId);
  const [clusterOverview, setClusterOverview] = useState(false);
  if (focusId && focusId !== focusSeen) {
    setFocusSeen(focusId);
    setSelectedId(focusId);
    setClusterOverview(false);
  }
  const {
    filters,
    update: updateFilters,
    clear: clearAllFilters,
    toggleNeighborhood,
    toggleScare,
    toggleSensitivity,
  } = useHouseFilters();
  const {
    accessibleOnly,
    candyOnly,
    openNowOnly,
    sensitivityFilters,
    scareFilters,
    neighborhoodFilters,
    likedOnly,
    unvisitedOnly,
    includeUndecorated,
  } = filters;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [routeMode, setRouteMode] = useState(false);
  const [pinnedRoute, setPinnedRoute] = useState<WalkingRoute | null>(null);
  const [routeFitTick, setRouteFitTick] = useState(0);
  const pendingRouteGps = useRef(false);
  const geoErrorToasted = useRef(false);
  const cheerTimer = useRef(0);
  const [visitCheer, setVisitCheer] = useState(false);
  const [askedLocation, setAskedLocation] = useState(false);
  const [originPickerOpen, setOriginPickerOpen] = useState(false);
  const [originPickActive, setOriginPickActive] = useState(false);
  const [originDraft, setOriginDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [originDraftLabel, setOriginDraftLabel] = useState("נקודה במפה");
  const [panTo, setPanTo] = useState<{ lat: number; lng: number } | null>(null);
  const [panTick, setPanTick] = useState(0);
  const [adminHouses, setAdminHouses] = useState<House[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForId, setEditForId] = useState(selectedId);
  if (selectedId !== editForId) {
    setEditForId(selectedId);
    setEditing(false);
  }
  const [busyAction, setBusyAction] = useState(false);

  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const owned = useOwnedHouses();
  const now = useAppNow();
  const onlineDevices = useOnlineDevices();

  useEffect(() => () => window.clearTimeout(cheerTimer.current), []);
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

  const rememberAdminDb = useCallback((houses: House[], updatedAt: string) => {
    saveServerDbBackup({
      updatedAt,
      houses: houses as ServerDbBackup["houses"],
    });
  }, []);

  const loadAdminHouses = useCallback(async () => {
    if (!admin) return;
    setAdminLoading(true);
    try {
      const res = await fetch("/api/admin/houses", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { houses?: House[]; updatedAt?: string };
      let houses = data.houses ?? [];
      let updatedAt = data.updatedAt ?? new Date().toISOString();
      const backup = loadServerDbBackup();
      if (backup && backupLooksNewer(backup, updatedAt, houses)) {
        const restoreRes = await fetch("/api/admin/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(backup),
        });
        if (restoreRes.ok) {
          const restored = (await restoreRes.json()) as {
            houses?: House[];
            updatedAt?: string;
          };
          houses = restored.houses ?? houses;
          updatedAt = restored.updatedAt ?? updatedAt;
          notifyCatalogChanged();
        }
      }
      setAdminHouses(houses);
      rememberAdminDb(houses, updatedAt);
    } catch {
      /* keep last list */
    } finally {
      setAdminLoading(false);
    }
  }, [admin, rememberAdminDb]);

  useEffect(() => {
    if (!admin) {
      setAdminHouses([]);
      setEditing(false);
      return;
    }
    void loadAdminHouses();
    const timer = window.setInterval(() => void loadAdminHouses(), 15_000);
    return () => window.clearInterval(timer);
  }, [admin, loadAdminHouses]);

  const wasAdmin = useRef(false);
  useEffect(() => {
    if (wasAdmin.current && !admin) {
      setSelectedId("closed");
      setClusterOverview(false);
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

  const houses = useMemo(() => {
    const listed = admin
      ? adminHouses
          .filter((house) => house.status !== "rejected")
          .map((house) => toPublicHouse(house) as PublicHouse)
      : (catalog?.houses ?? []);
    const byId = new Map(listed.map((house) => [house.id, house]));
    for (const item of owned) {
      if (!item.preview) continue;
      const current = byId.get(item.id);
      if (!current || Date.parse(item.preview.updatedAt) >= Date.parse(current.updatedAt || "")) {
        byId.set(item.id, item.preview);
      }
    }
    for (const pending of loadPendingWrites()) {
      const current = byId.get(pending.id);
      if (!current || Date.parse(pending.house.updatedAt) >= Date.parse(current.updatedAt || "")) {
        byId.set(pending.id, pending.house);
      }
    }
    return [...byId.values()];
  }, [admin, adminHouses, catalog, owned]);

  const visible = useMemo(() => {
    return houses.filter((house) => {
      if (!houseMatchesSet(house, houseSet)) return false;
      if (accessibleOnly && !house.accessible) return false;
      if (candyOnly && !offersCandy(house)) return false;
      if (!includeUndecorated && !isDecorated(house)) return false;
      if (openNowOnly && !isOpenNow(house, now)) return false;
      for (const sensitivity of sensitivityFilters) {
        if (!offersSensitivity(house, sensitivity)) return false;
      }
      if (isDecorated(house) && scareFilters.length > 0 && !scareFilters.includes(house.scareLevel)) {
        return false;
      }
      if (!houseInNeighborhoods(house, neighborhoodFilters)) return false;
      if (likedOnly && !likes.likedIds.includes(house.id)) return false;
      if (unvisitedOnly && visits.visitedIds.includes(house.id)) return false;
      return true;
    });
  }, [
    houses,
    houseSet,
    accessibleOnly,
    candyOnly,
    includeUndecorated,
    openNowOnly,
    sensitivityFilters,
    scareFilters,
    neighborhoodFilters,
    likedOnly,
    unvisitedOnly,
    likes.likedIds,
    visits.visitedIds,
    now,
  ]);

  const moreFilterCount =
    Number(accessibleOnly) +
    Number(candyOnly) +
    Number(openNowOnly) +
    Number(likedOnly) +
    Number(unvisitedOnly);
  // Empty or fully selected category = show all (not an active restriction).
  const neighborhoodActiveCount =
    neighborhoodFilters.length === 0 || neighborhoodFilters.length === NEIGHBORHOODS.length
      ? 0
      : neighborhoodFilters.length;
  const scareLevelsActive =
    scareFilters.length === 0 || scareFilters.length === SCARE_LEVELS.length
      ? 0
      : scareFilters.length;
  const scareActiveCount = scareLevelsActive + Number(!includeUndecorated);
  const activeFilterCount =
    neighborhoodActiveCount + sensitivityFilters.length + scareActiveCount + moreFilterCount;

  const pinCurrentRoute = useCallback(() => {
    const houses = visible.filter((house) => !visits.visitedIds.includes(house.id));
    setPinnedRoute(
      buildWalkingRoute(houses, origin, {
        accessible: accessibleOnly,
        startedFrom: origin.kind,
        originLabel: origin.label,
      }),
    );
    setRouteFitTick((n) => n + 1);
  }, [visible, visits.visitedIds, accessibleOnly, origin]);

  useEffect(() => {
    if (!routeMode || !pendingRouteGps.current || !gps) return;
    pendingRouteGps.current = false;
    pinCurrentRoute();
  }, [routeMode, gps, pinCurrentRoute]);

  useEffect(() => {
    if (gpsAllowed || originChoice.kind !== "gps") return;
    setOriginChoice({ kind: "neighborhood" });
  }, [gpsAllowed, originChoice.kind, setOriginChoice]);

  useEffect(() => {
    if (!routeMode || pendingRouteGps.current) return;
    pinCurrentRoute();
    // Rebuild when the start point changes, not on catalog ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin.kind, origin.lat, origin.lng, origin.label, routeMode]);

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
  const routeTicker = outsideNeighborhood
    ? "המיקום שלכם מחוץ למפת השכונה — סימנו את הקצה הקרוב."
    : originPickActive
      ? "לחצו על המפה כדי לקבוע נקודת התחלה"
      : routeMode
        ? `מסלול · ${walkingRoute?.stops.length ?? 0} עצירות`
        : null;
  const houseSetStatus = admin ? HOUSE_SET_STATUS[houseSet] : undefined;

  useEffect(() => {
    if (!geoError) {
      geoErrorToasted.current = false;
      return;
    }
    if (pendingRouteGps.current) {
      pendingRouteGps.current = false;
      pinCurrentRoute();
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
  }

  function exitRouteMode() {
    pendingRouteGps.current = false;
    setRouteMode(false);
    setPinnedRoute(null);
  }

  function goToMainMap() {
    setView("map");
    exitOriginPick();
    exitRouteMode();
    setSelectedId("closed");
    setClusterOverview(false);
  }

  function goHome() {
    exitOriginPick();
    exitRouteMode();
    setSelectedId("closed");
    setClusterOverview(false);
    setEditing(false);
  }

  function enterRouteMode() {
    if (routeMode) return;
    exitOriginPick();
    setSelectedId("closed");
    setClusterOverview(false);
    setEditing(false);
    setRouteMode(true);
    if (originChoice.kind === "gps" && !gps) {
      pendingRouteGps.current = true;
      setAskedLocation(true);
      geo.refresh();
      return;
    }
    pendingRouteGps.current = false;
    pinCurrentRoute();
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
    setView("map");
    setSelectedId("closed");
    setClusterOverview(false);
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
    const ids = likes.toggle(id);
    reportHouseTraffic(id, "saved", ids.includes(id));
  }

  function onToggleVisited(id: string) {
    const ids = visits.toggle(id);
    const marking = ids.includes(id);
    reportHouseTraffic(id, "visited", marking);
    if (!marking) return;
    setVisitCheer(false);
    window.clearTimeout(cheerTimer.current);
    window.requestAnimationFrame(() => {
      setVisitCheer(true);
      cheerTimer.current = window.setTimeout(() => setVisitCheer(false), 1600);
    });
  }

  function applyAdminHouse(next: House | PublicHouse) {
    const full = "editCode" in next && typeof next.editCode === "string"
      ? (next as House)
      : null;
    setAdminHouses((list) => {
      let nextList: House[];
      if (full) {
        const idx = list.findIndex((h) => h.id === full.id);
        if (idx < 0) nextList = [...list, full];
        else {
          nextList = [...list];
          nextList[idx] = full;
        }
      } else {
        nextList = list.map((h) => (h.id === next.id ? { ...h, ...next } : h));
      }
      const updatedAt = new Date().toISOString();
      rememberAdminDb(nextList, updatedAt);
      return nextList;
    });
    notifyCatalogChanged();
    void refresh(true);
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
    setAdminHouses((list) => {
      const next = list.filter((house) => house.id !== id);
      rememberAdminDb(next, new Date().toISOString());
      return next;
    });
    removeOwnedHouse(id);
    if (selectedId === id) {
      setSelectedId("closed");
      setClusterOverview(false);
      setEditing(false);
    }
    notifyCatalogChanged();
    void refresh(true);
  }

  async function patchAdmin(id: string, patch: Record<string, unknown>) {
    setBusyAction(true);
    try {
      const res = await fetch(`/api/admin/houses/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await readApiJson<{ error?: string; house?: House }>(res);
      if (!res.ok || !data.house) {
        toast.error(data.error ?? "העדכון נכשל");
        return false;
      }
      applyAdminHouse(data.house);
      return true;
    } catch {
      toast.error("אין קשר לשרת");
      return false;
    } finally {
      setBusyAction(false);
    }
  }

  async function approveHouse(id: string) {
    const ok = await patchAdmin(id, { status: "approved" });
    if (ok) toast.success("הבית אושר ונכנס למפה הציבורית");
  }

  async function rejectHouse(id: string) {
    setBusyAction(true);
    try {
      const res = await fetch(`/api/admin/houses/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await readApiJson<{ error?: string; ok?: boolean }>(res);
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "המחיקה נכשלה");
        return;
      }
      setAdminHouses((list) => {
        const next = list.filter((house) => house.id !== id);
        rememberAdminDb(next, new Date().toISOString());
        return next;
      });
      notifyCatalogChanged();
      void refresh(true);
      toast.success("הבית נדחה ונמחק");
      setSelectedId("closed");
      setClusterOverview(false);
    } catch {
      toast.error("אין קשר לשרת");
    } finally {
      setBusyAction(false);
    }
  }

  async function onRefresh() {
    if (admin) await loadAdminHouses();
    await refresh(true);
  }

  return (
    <div
      id="neighborhood-shell"
      className="relative isolate flex flex-col overflow-hidden"
      style={{ display: "flex", flexDirection: "column", height: "var(--app-h, 100svh)", overflow: "hidden" }}
    >
      <AppHeader onMainTap={goToMainMap} onHomeTap={goHome} />
      <div
        className="app-toolbar relative z-40 border-b border-orange-500/15 bg-[#12081a]/80 px-3 py-2"
        style={{ flexShrink: 0 }}
      >
        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto">
          <div className="flex rounded-xl bg-[#261536] p-0.5 ring-1 ring-orange-400/40">
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
        {routeTicker ? (
          <StatusTicker text={routeTicker} tone={outsideNeighborhood ? "warn" : "normal"} />
        ) : null}
      </div>
      <FiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        activeCount={activeFilterCount}
        onClear={clearAllFilters}
      >
        <FilterSection title="שכונה">
          {NEIGHBORHOODS.map((area) => (
            <FilterOption
              key={area}
              checked={neighborhoodFilters.includes(area)}
              onChange={() => toggleNeighborhood(area)}
            >
              {area}
            </FilterOption>
          ))}
        </FilterSection>
        <FilterSection title="רמת פחד">
          <FilterOption
            checked={includeUndecorated}
            onChange={() => updateFilters({ includeUndecorated: !includeUndecorated })}
          >
            <span className="inline-flex items-center gap-2">
              <ScareSign level="none" />
              <span>{decorShort.none}</span>
            </span>
          </FilterOption>
          {SCARE_LEVELS.map((level) => (
            <FilterOption
              key={level}
              checked={scareFilters.includes(level)}
              onChange={() => toggleScare(level)}
            >
              <ScareMark labeled level={level} />
            </FilterOption>
          ))}
        </FilterSection>
        <FilterSection title="עוד">
          <FilterOption
            checked={openNowOnly}
            onChange={() => updateFilters({ openNowOnly: !openNowOnly })}
          >
            <OpenNowMark labeled />
          </FilterOption>
          <FilterOption
            checked={candyOnly}
            onChange={() => updateFilters({ candyOnly: !candyOnly })}
          >
            <CandyMark labeled />
          </FilterOption>
          <FilterOption
            checked={accessibleOnly}
            onChange={() => updateFilters({ accessibleOnly: !accessibleOnly })}
          >
            <AccessibleMark labeled />
          </FilterOption>
          <FilterOption
            checked={likedOnly}
            onChange={() => updateFilters({ likedOnly: !likedOnly })}
          >
            <LikedMark labeled />
          </FilterOption>
          <FilterOption
            checked={unvisitedOnly}
            onChange={() => updateFilters({ unvisitedOnly: !unvisitedOnly })}
          >
            <UnvisitedMark labeled />
          </FilterOption>
        </FilterSection>
        <FilterSection title="רגישויות">
          {SENSITIVITY_OPTIONS.map((id) => (
            <FilterOption
              key={id}
              checked={sensitivityFilters.includes(id)}
              onChange={() => toggleSensitivity(id)}
            >
              <SensitivityMark labeled kind={id} />
            </FilterOption>
          ))}
        </FilterSection>
      </FiltersSheet>
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
        className="relative z-0 min-h-0 flex-1 isolate"
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
                onSelect={(house, opts) => {
                  if (originPickActive) return;
                  setClusterOverview(Boolean(opts?.clusterOverview));
                  setSelectedId(house.id);
                }}
                onClose={() => {
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
                  <p className="min-w-0 flex-1 truncate text-base text-orange-100">{originDraftLabel}</p>
                  <Button type="button" variant="outline" size="sm" onClick={exitOriginPick}>
                    ביטול
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-orange-500 text-black hover:bg-orange-400"
                    disabled={!originDraft}
                    onClick={() => void saveOriginPick()}
                  >
                    שמירת התחלה
                  </Button>
                </div>
              ) : null}
              <CatalogMetaChip
                houseCount={visible.length}
                offline={offline}
                unreachable={unreachable}
                source={source}
                onlineDevices={onlineDevices}
                houseSetLabel={HOUSE_SET_LABELS[houseSet]}
              />
            </div>
            <PullToRefresh
              onRefresh={onRefresh}
              disabled={view !== "list" || loading || adminLoading}
              className={cn(
                "absolute inset-0 overflow-y-auto bg-[#12081a]",
                view === "list" ? "z-10" : "invisible pointer-events-none z-0",
              )}
              style={{ position: "absolute", inset: 0, overflowY: "auto", background: "#12081a" }}
              aria-hidden={view !== "list"}
            >
                {routeMode ? (
                  <RouteList
                    route={walkingRoute}
                    hasGps={Boolean(gps)}
                    onRequestLocation={gpsAllowed ? chooseGpsOrigin : undefined}
                    setLabel={houseSetStatus}
                    onSelectHouse={(id) => {
                      setView("map");
                      setClusterOverview(false);
                      setSelectedId(id);
                    }}
                  />
                ) : (
                  <HouseList
                    houses={visible}
                    origin={origin}
                    catalogSource={source}
                    setLabel={houseSetStatus}
                    likedIds={likes.likedIds}
                    onToggleLike={onToggleLike}
                    visitedIds={visits.visitedIds}
                    onToggleVisited={onToggleVisited}
                    admin={admin}
                    onlineDevices={onlineDevices}
                    canEditHouse={(id) => Boolean(admin || owned.some((item) => item.id === id))}
                    editCodeFor={(id) =>
                      admin ? editCodeById.get(id) : owned.find((item) => item.id === id)?.editCode
                    }
                    onHouseUpdated={handleHouseUpdated}
                    onHouseDeleted={handleHouseDeleted}
                  />
                )}
            </PullToRefresh>
          </>
        )}
        {selected && view === "map" && !originPickActive ? (
        <MapHouseSheet
          house={selected}
          clusterHouses={view === "map" ? selectedCluster : [selected]}
          clusterOverview={view === "map" && clusterOverview}
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
                    onClick={() => void rejectHouse(selected.id)}
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

function StatusTicker({
  text,
  tone,
}: {
  text: string;
  tone: "normal" | "warn";
}) {
  return (
    <div className="mt-1 flex min-w-0 items-center">
      <PingPongMarquee
        text={text}
        className={cn("flex-1 text-base", tone === "warn" ? "text-amber-200" : "text-orange-100")}
      />
    </div>
  );
}

function CatalogMetaChip({
  houseCount,
  offline,
  unreachable,
  source,
  onlineDevices,
  houseSetLabel,
}: {
  houseCount: number;
  offline: boolean;
  unreachable: boolean;
  source: string | null;
  onlineDevices?: number | null;
  houseSetLabel: string;
}) {
  const stale = offline || unreachable || source === "cache" || source === "snapshot";
  return (
    <div className="pointer-events-none absolute top-2 start-2 z-10">
      <span className="inline-flex max-w-[min(100%,18rem)] items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#12081a]/90 px-2 py-1 text-base text-violet-200 ring-1 ring-orange-500/25 backdrop-blur-sm">
        <span>{houseCount} בתים</span>
        {onlineDevices != null ? <span>· {onlineDevices} מבקרים</span> : null}
        <span>· {houseSetLabel}</span>
        {stale ? (
          <>
            <WifiOff className="size-3 shrink-0" />
            <span>
              {offline
                ? "לא מקוון"
                : unreachable
                  ? "השרת לא עונה"
                  : source === "snapshot"
                    ? "עותק סטטי"
                    : "שמור בטלפון"}
            </span>
          </>
        ) : null}
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
        "inline-flex h-9 w-11 items-center justify-center rounded-lg",
        active ? "bg-orange-500 text-black" : "text-violet-200",
      )}
    >
      {icon}
    </button>
  );
}
