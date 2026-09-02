"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { List, LogOut, MapPinned, RefreshCw, Route, WifiOff } from "lucide-react";
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
import { HouseDetails } from "@/components/house-details";
import { NightDesk } from "@/components/night-desk";
import { RouteSheet } from "@/components/route-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useHouseFilters } from "@/hooks/use-house-filters";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { useUserLocation } from "@/hooks/use-user-location";
import { useVisitedHouses } from "@/hooks/use-visited-houses";
import { readApiJson } from "@/lib/api-json";
import { houseInNeighborhoods, inNeighborhood, NEIGHBORHOODS, formatDisplayAddress, type NeighborhoodId } from "@/lib/config";
import { toPublicHouse } from "@/lib/ids";
import { isFrozen, offersCandy, offersSensitivity } from "@/lib/house-state";
import { isOpenNow } from "@/lib/hours";
import {
  backupLooksNewer,
  loadServerDbBackup,
  notifyCatalogChanged,
  saveOwnedHouse,
  saveServerDbBackup,
  type ServerDbBackup,
} from "@/lib/offline-db";
import { scareShort, treatLabels } from "@/lib/labels";
import { buildWalkingRoute } from "@/lib/route";
import type { Catalog, House, PublicHouse, ScareLevel, SensitivityId } from "@/lib/types";
import { SCARE_LEVELS, SENSITIVITY_OPTIONS } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NeighborhoodApp({
  initialCatalog,
  focusId = null,
}: {
  initialCatalog: Catalog;
  focusId?: string | null;
}) {
  const { catalog, loading, offline, error, source, refresh } = useCatalog(initialCatalog);
  const { ready: adminReady, admin, logout } = useAdminSession();
  const geo = useUserLocation();
  const origin = geo.location;
  const [view, setView] = useState<"map" | "list">("map");
  const [selectedId, setSelectedId] = useState<string | "closed" | null>(null);
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
  } = filters;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [followTick, setFollowTick] = useState(0);
  const [fitTick, setFitTick] = useState(0);
  const [askedLocation, setAskedLocation] = useState(false);
  const [adminHouses, setAdminHouses] = useState<House[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [familyEditCode, setFamilyEditCode] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);

  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const owned = useOwnedHouses();
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

  useEffect(() => {
    setEditing(false);
    setFamilyEditCode("");
  }, [selectedId]);

  const editCodeById = useMemo(() => {
    const map = new Map<string, string>();
    for (const house of adminHouses) map.set(house.id, house.editCode);
    return map;
  }, [adminHouses]);

  const pendingQueue = useMemo(
    () => adminHouses.filter((house) => house.status === "pending"),
    [adminHouses],
  );

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
      if (openNowOnly && !isOpenNow(house)) return false;
      for (const sensitivity of sensitivityFilters) {
        if (!offersSensitivity(house, sensitivity)) return false;
      }
      if (scareFilters.length > 0 && !scareFilters.includes(house.scareLevel)) return false;
      if (!houseInNeighborhoods(house, neighborhoodFilters)) return false;
      if (likedOnly && !likes.likedIds.includes(house.id)) return false;
      if (unvisitedOnly && visits.visitedIds.includes(house.id)) return false;
      return true;
    });
  }, [
    houses,
    accessibleOnly,
    candyOnly,
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
  const scareActiveCount =
    scareFilters.length === 0 || scareFilters.length === SCARE_LEVELS.length
      ? 0
      : scareFilters.length;
  const activeFilterCount =
    neighborhoodActiveCount + sensitivityFilters.length + scareActiveCount + moreFilterCount;

  const walkingRoute = useMemo(
    () => buildWalkingRoute(visible, origin),
    [visible, origin],
  );

  const routePrefsLabel = useMemo(() => {
    const parts: string[] = [];
    if (openNowOnly) parts.push("פתוח עכשיו");
    if (candyOnly) parts.push("ממתקים");
    if (accessibleOnly) parts.push("נגיש");
    if (likedOnly) parts.push("שמרתי");
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
  const geoError =
    askedLocation && (geo.status === "denied" || geo.status === "error" || geo.status === "unavailable");
  const outsideNeighborhood = Boolean(
    origin && askedLocation && followTick > 0 && !inNeighborhood(origin.lat, origin.lng),
  );

  function goToMyLocation() {
    setAskedLocation(true);
    setFollowTick((n) => n + 1);
    geo.refresh();
  }

  function goToMainMap() {
    setView("map");
    setSelectedId("closed");
    setFitTick((n) => n + 1);
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

  async function unlockWithFamilyCode(house: PublicHouse) {
    const code = familyEditCode.trim();
    if (!code) {
      toast.error("הזינו את קוד העריכה (6 ספרות)");
      return;
    }
    setUnlockBusy(true);
    try {
      const res = await fetch(`/api/houses/${encodeURIComponent(house.id)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editCode: code }),
      });
      const data = await readApiJson<{ error?: string; house?: PublicHouse }>(res);
      if (!res.ok || !data.house) {
        toast.error(data.error ?? "קוד העריכה שגוי");
        return;
      }
      saveOwnedHouse({
        id: data.house.id,
        name: data.house.name,
        editCode: code,
        preview: data.house,
      });
      setFamilyEditCode("");
      setEditing(true);
      toast.success("אפשר לעדכן מלאי ופרטים");
      void refresh(true);
    } catch {
      toast.error("אין קשר לשרת");
    } finally {
      setUnlockBusy(false);
    }
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
    } catch {
      toast.error("אין קשר לשרת");
    } finally {
      setBusyAction(false);
    }
  }

  async function onLogout() {
    await logout();
    setAdminHouses([]);
    setSelectedId("closed");
    setEditing(false);
    toast.message("יצאתם ממצב מנהל");
    void refresh(true);
  }

  async function onRefresh() {
    if (admin) await loadAdminHouses();
    await refresh(true);
  }

  return (
    <div
      id="neighborhood-shell"
      className="relative isolate flex h-dvh flex-col overflow-hidden"
      style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}
    >
      <AppHeader
        onMainTap={goToMainMap}
        actions={
          <>
            {!admin ? (
              <Link
                href="/edit"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
              >
                עריכת בית
              </Link>
            ) : null}
            {adminReady && admin ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-orange-400/40 text-orange-100"
                onClick={() => void onLogout()}
              >
                <LogOut className="size-3.5" />
                יציאה
              </Button>
            ) : (
              <Link
                href="/admin"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-violet-200")}
              >
                ניהול
              </Link>
            )}
          </>
        }
      />
      {admin ? (
        <div
          className="relative z-40 border-b border-amber-500/25 bg-[#2a1638]/95 px-3 py-2"
          style={{ flexShrink: 0 }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-amber-100">
              מצב מנהל · עריכה בלי קוד · הקפאה ומחיקה
            </p>
            <span className="text-[11px] text-violet-300">
              בתים חדשים נכנסים למפה מיד · יציאה רק בכפתור
            </span>
          </div>
          {pendingQueue.length > 0 ? (
            <ul className="mt-2 max-h-28 space-y-1.5 overflow-y-auto">
              {pendingQueue.map((house) => (
                <li
                  key={house.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg bg-black/25 px-2.5 py-1.5"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-start"
                    onClick={() => setSelectedId(house.id)}
                  >
                    <span className="block truncate text-sm text-orange-100">{house.name}</span>
                    <span className="block truncate text-[11px] text-violet-300">
                      {formatDisplayAddress(house)} · קוד {house.editCode}
                    </span>
                  </button>
                  <Button
                    size="sm"
                    className="h-8 bg-emerald-600 text-white hover:bg-emerald-500"
                    disabled={busyAction}
                    onClick={() => void approveHouse(house.id)}
                  >
                    אישור
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={busyAction}
                    onClick={() => void rejectHouse(house.id)}
                  >
                    דחייה ומחיקה
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[11px] text-violet-300">מוקפאים מופיעים במפה כסיכות שקופות. לחצו על בית לעריכה או מחיקה.</p>
          )}
        </div>
      ) : null}
      <div
        className="app-toolbar relative z-40 border-b border-orange-500/15 bg-[#12081a]/80 px-3 py-2"
        style={{ flexShrink: 0 }}
      >
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-[#1d1028] p-0.5 ring-1 ring-orange-500/20">
            <Toggle active={view === "map"} onClick={() => setView("map")} icon={<MapPinned className="size-3.5" />}>
              מפה
            </Toggle>
            <Toggle active={view === "list"} onClick={() => setView("list")} icon={<List className="size-3.5" />}>
              רשימה
            </Toggle>
          </div>
          <FilterTrigger activeCount={activeFilterCount} onClick={() => setFiltersOpen(true)} />
          <button
            type="button"
            aria-label="בניית מסלול"
            onClick={() => {
              if (!origin) {
                setAskedLocation(true);
                setFollowTick((n) => n + 1);
                geo.refresh();
              }
              setRouteOpen(true);
            }}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25"
          >
            <Route className="size-4" />
          </button>
          <Button size="sm" variant="ghost" onClick={() => void onRefresh()}>
            <RefreshCw className={cn("size-3.5", adminLoading && "animate-spin")} />
            רענון
          </Button>
          <span className="ms-auto flex items-center gap-1 text-[11px] text-violet-300">
            {offline || source === "cache" || source === "snapshot" ? (
              <>
                <WifiOff className="size-3" />
                {offline ? "לא מקוון" : source === "snapshot" ? "עותק סטטי" : "מהזיכרון"}
              </>
            ) : (
              <span>{visible.length} בתים</span>
            )}
          </span>
        </div>
        {geoError ? (
          <p className="mt-1 text-[11px] text-amber-200">לא הצלחנו לקרוא מיקום. אשרו גישה למיקום בדפדפן.</p>
        ) : outsideNeighborhood ? (
          <p className="mt-1 text-[11px] text-amber-200">המיקום שלכם מחוץ למפת השכונה — סימנו את הקצה הקרוב.</p>
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
        <FilterSection title="רגישויות">
          {SENSITIVITY_OPTIONS.map((id) => (
            <FilterOption
              key={id}
              checked={sensitivityFilters.includes(id)}
              onChange={() => toggleSensitivity(id)}
            >
              {treatLabels[id]}
            </FilterOption>
          ))}
        </FilterSection>
        <FilterSection title="רמת פחד">
          {SCARE_LEVELS.map((level) => (
            <FilterOption
              key={level}
              checked={scareFilters.includes(level)}
              onChange={() => toggleScare(level)}
            >
              {scareShort[level]}
            </FilterOption>
          ))}
        </FilterSection>
        <FilterSection title="עוד">
          <FilterOption
            checked={openNowOnly}
            onChange={() => updateFilters({ openNowOnly: !openNowOnly })}
          >
            פתוח עכשיו
          </FilterOption>
          <FilterOption
            checked={candyOnly}
            onChange={() => updateFilters({ candyOnly: !candyOnly })}
          >
            יש ממתקים
          </FilterOption>
          <FilterOption
            checked={accessibleOnly}
            onChange={() => updateFilters({ accessibleOnly: !accessibleOnly })}
          >
            נגיש
          </FilterOption>
          <FilterOption
            checked={likedOnly}
            onChange={() => updateFilters({ likedOnly: !likedOnly })}
          >
            שמרתי
          </FilterOption>
          <FilterOption
            checked={unvisitedOnly}
            onChange={() => updateFilters({ unvisitedOnly: !unvisitedOnly })}
          >
            לא ביקרתי
          </FilterOption>
        </FilterSection>
      </FiltersSheet>
      <RouteSheet
        open={routeOpen}
        onOpenChange={setRouteOpen}
        route={walkingRoute}
        prefsLabel={routePrefsLabel}
        hasGps={Boolean(origin)}
        onRequestLocation={goToMyLocation}
        onSelectHouse={(id) => setSelectedId(id)}
      />
      {error ? (
        <div className="relative z-30 bg-red-950/70 px-3 py-2 text-center text-sm text-red-100">
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
                "map-stage absolute inset-0",
                view !== "map" && "invisible pointer-events-none",
              )}
              style={{ position: "absolute", inset: 0 }}
              aria-hidden={view !== "map"}
            >
              <HouseMapDynamic
                houses={visible}
                selectedId={selected?.id}
                onSelect={(house) => setSelectedId(house.id)}
                className="h-full w-full"
                active={view === "map"}
                userLocation={origin}
                followTick={followTick}
                fitTick={fitTick}
                locating={geo.status === "pending" && askedLocation}
                onLocate={goToMyLocation}
              />
            </div>
            {view === "list" ? (
              <div
                className="absolute inset-0 overflow-y-auto bg-[#12081a]"
                style={{ position: "absolute", inset: 0, overflowY: "auto", background: "#12081a" }}
              >
                <HouseList
                  houses={visible}
                  onOpen={(house) => setSelectedId(house.id)}
                  origin={origin}
                  likedIds={likes.likedIds}
                  onToggleLike={likes.toggle}
                  visitedIds={visits.visitedIds}
                  onToggleVisited={visits.toggle}
                />
              </div>
            ) : null}
          </>
        )}
      </main>
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId("closed");
        }}
      >
        {selected ? (
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto bg-[#1a0d24] sm:max-w-none">
            <SheetHeader>
              <SheetTitle className="sr-only">פרטי בית</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-8">
              {selected.status === "pending" ? (
                <p className="mb-3 rounded-lg bg-violet-950/70 px-3 py-2 text-sm text-violet-100">
                  {admin
                    ? "בית ממתין לאישור — עדיין לא במפה הציבורית."
                    : "הבית הזה עדיין לא במפה הציבורית. אם זה הבית שלכם, מנהל יכול לאשר אותו."}
                </p>
              ) : null}
              {isFrozen(selected) ? (
                <p className="mb-3 rounded-lg bg-[#2a1638] px-3 py-2 text-sm text-amber-100">
                  הבית מוקפא — הילדים בשכונה לא רואים אותו. רק אתם (או מנהל) רואים את הסיכה השקופה.
                </p>
              ) : null}
              <HouseDetails
                house={selected}
                catalogSource={source}
                liked={likes.liked(selected.id)}
                onToggleLike={() => likes.toggle(selected.id)}
                visited={visits.visited(selected.id)}
                onToggleVisited={() => visits.toggle(selected.id)}
                managerEditCode={admin ? editCodeById.get(selected.id) : undefined}
                canEdit
                editing={editing}
                onToggleEdit={() => setEditing((v) => !v)}
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
                    {editing ? (
                      canEditSelected ? (
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
                      ) : (
                        <div className="space-y-3 rounded-2xl bg-[#1d1028] p-3 ring-1 ring-orange-400/30">
                          <p className="text-sm font-medium text-orange-200">קוד עריכה למשפחה</p>
                          <p className="text-xs text-violet-300">
                            הזינו את קוד העריכה (6 ספרות) שקיבל מי שהוסיף את הבית — ואפשר לעדכן מלאי
                            ותמונה כמו כולם.
                          </p>
                          <Input
                            value={familyEditCode}
                            onChange={(e) => setFamilyEditCode(e.target.value)}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="6 ספרות"
                            className="h-10 bg-[#12081a] text-base tracking-widest"
                            maxLength={12}
                          />
                          <Button
                            type="button"
                            className="w-full bg-orange-500 text-black hover:bg-orange-400"
                            disabled={unlockBusy || !familyEditCode.trim()}
                            onClick={() => void unlockWithFamilyCode(selected)}
                          >
                            {unlockBusy ? "בודקים…" : "פתיחה לעריכה"}
                          </Button>
                        </div>
                      )
                    ) : null}
                  </div>
                }
              />
            </div>
          </SheetContent>
        ) : null}
      </Sheet>
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
        "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm",
        active ? "bg-orange-500 text-black" : "text-orange-100",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
