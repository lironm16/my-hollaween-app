"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { List, MapPinned, RefreshCw, Route, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import {
  FilterOption,
  FilterSection,
  FilterTrigger,
  FiltersSheet,
} from "@/components/filter-menu";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { HouseList } from "@/components/house-list";
import { MapHouseSheet } from "@/components/map-house-sheet";
import { NightDesk } from "@/components/night-desk";
import { RouteList } from "@/components/route-list";
import { useRouteGeometry } from "@/hooks/use-route-geometry";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useHouseFilters } from "@/hooks/use-house-filters";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { useUserLocation } from "@/hooks/use-user-location";
import { useVisitedHouses } from "@/hooks/use-visited-houses";
import { readApiJson } from "@/lib/api-json";
import { houseInNeighborhoods, inNeighborhood, NEIGHBORHOODS, type NeighborhoodId } from "@/lib/config";
import { clusterHousesByAddress } from "@/lib/house-clusters";
import { toPublicHouse } from "@/lib/ids";
import { isFrozen, offersCandy, offersSensitivity, isDecorated } from "@/lib/house-state";
import { AccessibleMark } from "@/components/symbols";
import { CandyMark } from "@/components/candy-glyphs";
import { SensitivityMark } from "@/components/sensitivity-glyphs";
import { OpenNowMark } from "@/components/open-now-mark";
import { LikedMark, UnvisitedMark } from "@/components/visit-marks";
import { ScareMark, ScareSign } from "@/components/scare-glyphs";
import { isOpenNow } from "@/lib/hours";
import {
  backupLooksNewer,
  loadServerDbBackup,
  notifyCatalogChanged,
  saveOwnedHouse,
  saveServerDbBackup,
  type ServerDbBackup,
} from "@/lib/offline-db";
import { scareShort, treatLabels, decorShort } from "@/lib/labels";
import { movedAtLeast, ROUTE_REANCHOR_METERS } from "@/lib/geo";
import { readHomeView, writeHomeView, type HomeView } from "@/lib/home-view";
import { buildWalkingRoute } from "@/lib/route";
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
  const origin = geo.location;
  const [routeAnchor, setRouteAnchor] = useState<{ lat: number; lng: number } | null>(null);
  const view = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("hw-home-view", onStoreChange);
      return () => window.removeEventListener("hw-home-view", onStoreChange);
    },
    readHomeView,
    () => "map" as HomeView,
  );
  const [selectedId, setSelectedId] = useState<string | "closed" | null>(null);
  const [clusterOverview, setClusterOverview] = useState(false);
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
  const [followTick, setFollowTick] = useState(0);
  const [fitTick, setFitTick] = useState(0);
  const [askedLocation, setAskedLocation] = useState(false);
  const [adminHouses, setAdminHouses] = useState<House[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const owned = useOwnedHouses();

  function setView(next: HomeView) {
    writeHomeView(next);
  }

  const ownedEditCode = useMemo(() => {
    if (!selectedId || selectedId === "closed") return undefined;
    return owned.find((item) => item.id === selectedId)?.editCode;
  }, [owned, selectedId]);
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
    setEditing(false);
  }, [selectedId]);

  const editCodeById = useMemo(() => {
    const map = new Map<string, string>();
    for (const house of adminHouses) map.set(house.id, house.editCode);
    return map;
  }, [adminHouses]);

  const houses = useMemo(() => {
    if (admin) {
      return adminHouses
        .filter((house) => house.status !== "rejected")
        .map((house) => toPublicHouse(house) as PublicHouse);
    }
    return catalog?.houses ?? [];
  }, [admin, adminHouses, catalog]);

  const visible = useMemo(() => {
    return houses.filter((house) => {
      if (accessibleOnly && !house.accessible) return false;
      if (candyOnly && !offersCandy(house)) return false;
      if (!includeUndecorated && !isDecorated(house)) return false;
      if (openNowOnly && !isOpenNow(house)) return false;
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

  useEffect(() => {
    if (!routeMode) {
      setRouteAnchor(origin ? { lat: origin.lat, lng: origin.lng } : null);
      return;
    }
    if (!origin) return;
    setRouteAnchor((prev) => {
      if (!prev) return { lat: origin.lat, lng: origin.lng };
      if (movedAtLeast(prev, origin, ROUTE_REANCHOR_METERS)) {
        return { lat: origin.lat, lng: origin.lng };
      }
      return prev;
    });
  }, [routeMode, origin]);

  const walkingRoute = useMemo(
    () =>
      buildWalkingRoute(visible, routeMode ? (routeAnchor ?? origin) : origin, {
        accessible: accessibleOnly,
      }),
    [visible, routeMode, routeAnchor, origin, accessibleOnly],
  );
  const { line: routeLine } = useRouteGeometry(walkingRoute, routeMode);

  const routePrefsLabel = useMemo(() => {
    const parts: string[] = [];
    if (openNowOnly) parts.push("פתוח עכשיו");
    if (candyOnly) parts.push("ממתקים");
    if (!includeUndecorated) parts.push("מקושט");
    if (accessibleOnly) parts.push("נגיש");
    if (likedOnly) parts.push("אהבתי");
    if (unvisitedOnly) parts.push("לא ביקרתי");
    for (const id of sensitivityFilters) parts.push(treatLabels[id]);
    if (scareActiveCount > 0) {
      parts.push(scareFilters.map((level) => scareShort[level]).join("/"));
    }
    if (neighborhoodActiveCount > 0) parts.push(neighborhoodFilters.join(" · "));
    return parts.slice(0, 4).join(" · ");
  }, [
    openNowOnly,
    candyOnly,
    includeUndecorated,
    accessibleOnly,
    likedOnly,
    unvisitedOnly,
    sensitivityFilters,
    scareFilters,
    scareActiveCount,
    neighborhoodFilters,
    neighborhoodActiveCount,
  ]);

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
    origin && askedLocation && followTick > 0 && !inNeighborhood(origin.lat, origin.lng),
  );

  function goToMyLocation() {
    setAskedLocation(true);
    setFollowTick((n) => n + 1);
    setRouteAnchor(null);
    geo.refresh();
  }

  function goToMainMap() {
    setView("map");
    setRouteMode(false);
    setSelectedId("closed");
    setClusterOverview(false);
    setFitTick((n) => n + 1);
  }

  function goHome() {
    setRouteMode(false);
    setSelectedId("closed");
    setClusterOverview(false);
    setEditing(false);
  }

  function enterRouteMode() {
    if (!origin) {
      setAskedLocation(true);
      setFollowTick((n) => n + 1);
      geo.refresh();
    }
    setRouteMode(true);
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
        <div className="flex flex-nowrap items-center gap-2">
          <div className="flex rounded-lg bg-[#1d1028] p-0.5 ring-1 ring-orange-500/20">
            <Toggle active={view === "map"} onClick={() => setView("map")} icon={<MapPinned className="size-3.5" />}>
              מפה
            </Toggle>
            <Toggle
              active={view === "list"}
              onClick={() => {
                setView("list");
                setSelectedId("closed");
                setClusterOverview(false);
                setEditing(false);
              }}
              icon={<List className="size-3.5" />}
            >
              רשימה
            </Toggle>
          </div>
          <FilterTrigger activeCount={activeFilterCount} onClick={() => setFiltersOpen(true)} />
          <button
            type="button"
            aria-label={routeMode ? "יציאה מהמסלול" : "מסלול"}
            aria-pressed={routeMode}
            onClick={() => (routeMode ? setRouteMode(false) : enterRouteMode())}
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
              routeMode
                ? "bg-orange-500 text-black"
                : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25",
            )}
          >
            <Route className="size-4" />
          </button>
          <button
            type="button"
            aria-label="רענון"
            title="רענון"
            onClick={() => void onRefresh()}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25"
          >
            <RefreshCw className={cn("size-4", (loading || adminLoading) && "animate-spin")} />
          </button>
        </div>
        {geoError ? (
          <p className="mt-1 text-base text-amber-200">לא הצלחנו לקרוא מיקום. אשרו גישה למיקום בדפדפן.</p>
        ) : outsideNeighborhood ? (
          <p className="mt-1 text-base text-amber-200">המיקום שלכם מחוץ למפת השכונה — סימנו את הקצה הקרוב.</p>
        ) : routeMode ? (
          <p className="mt-1 text-base text-violet-300">
            מסלול לפי הסינון{routePrefsLabel ? ` · ${routePrefsLabel}` : ""} ·{" "}
            {walkingRoute?.stops.length ?? 0} עצירות
          </p>
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
                selectedId={selected?.id}
                clusterOverview={clusterOverview}
                onSelect={(house, opts) => {
                  setClusterOverview(Boolean(opts?.clusterOverview));
                  setSelectedId(house.id);
                }}
                onClose={() => {
                  setClusterOverview(false);
                  setSelectedId("closed");
                }}
                className="h-full w-full"
                active={view === "map"}
                userLocation={origin}
                followTick={followTick}
                fitTick={fitTick}
                locating={geo.status === "pending" && askedLocation}
                onLocate={goToMyLocation}
                routeLine={routeMode ? routeLine : null}
                routeStops={
                  routeMode && walkingRoute
                    ? walkingRoute.stops.map((stop) => ({
                        id: stop.house.id,
                        order: stop.order,
                        lat: stop.house.lat,
                        lng: stop.house.lng,
                      }))
                    : null
                }
              />
              <CatalogMetaChip
                houseCount={visible.length}
                stopCount={routeMode ? walkingRoute?.stops.length ?? 0 : null}
                offline={offline}
                unreachable={unreachable}
                source={source}
              />
            </div>
            {view === "list" ? (
              <div
                className="absolute inset-0 overflow-y-auto bg-[#12081a]"
                style={{ position: "absolute", inset: 0, overflowY: "auto", background: "#12081a" }}
              >
                {routeMode ? (
                  <RouteList
                    route={walkingRoute}
                    prefsLabel={routePrefsLabel}
                    hasGps={Boolean(origin)}
                    onRequestLocation={goToMyLocation}
                    onSelectHouse={(id) => {
                      setClusterOverview(false);
                      setSelectedId(id);
                    }}
                  />
                ) : (
                  <HouseList
                    houses={visible}
                    onOpen={(house) => {
                      setClusterOverview(false);
                      setSelectedId(house.id);
                    }}
                    origin={origin}
                    likedIds={likes.likedIds}
                    onToggleLike={likes.toggle}
                    visitedIds={visits.visitedIds}
                    onToggleVisited={visits.toggle}
                  />
                )}
              </div>
            ) : null}
          </>
        )}
        {selected ? (
        <MapHouseSheet
          house={selected}
          clusterHouses={view === "map" ? selectedCluster : [selected]}
          clusterOverview={view === "map" && clusterOverview}
          onClose={() => {
            setClusterOverview(false);
            setSelectedId("closed");
          }}
          liked={likes.liked}
          onToggleLike={likes.toggle}
          visited={visits.visited}
          onToggleVisited={visits.toggle}
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
          frozenNote={
            isFrozen(selected) ? (
              <p className="mb-3 rounded-lg bg-[#2a1638] px-3 py-2 text-base text-amber-100">
                הבית מוקפא — הילדים בשכונה לא רואים אותו. רק אתם (או מנהל) רואים את הסיכה השקופה.
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
                  editCode={admin ? editCodeById.get(selected.id) : ownedEditCode}
                  onUpdated={(next) => {
                    if (admin) {
                      applyAdminHouse(next);
                      return;
                    }
                    const code = ownedEditCode;
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
                  }}
                />
              ) : null}
            </div>
          }
        />
        ) : null}
      </main>
    </div>
  );
}

function CatalogMetaChip({
  houseCount,
  stopCount,
  offline,
  unreachable,
  source,
}: {
  houseCount: number;
  stopCount?: number | null;
  offline: boolean;
  unreachable: boolean;
  source: string | null;
}) {
  const stale = offline || unreachable || source === "cache" || source === "snapshot";
  return (
    <div className="pointer-events-none absolute top-2 start-2 z-10">
      <span className="inline-flex max-w-[min(100%,16rem)] items-center gap-1.5 rounded-lg bg-[#12081a]/90 px-2 py-1 text-base text-violet-200 ring-1 ring-orange-500/25 backdrop-blur-sm">
        <span>{houseCount} בתים</span>
        {stopCount != null ? <span>· {stopCount} עצירות</span> : null}
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
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-base",
        active ? "bg-orange-500 text-black" : "text-orange-100",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
