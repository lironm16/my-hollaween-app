"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, List, LogOut, MapPinned, RefreshCw, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { FilterChip } from "@/components/filter-chip";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { HouseList } from "@/components/house-list";
import { HouseDetails } from "@/components/house-details";
import { HouseForm } from "@/components/house-form";
import { NightDesk } from "@/components/night-desk";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { useUserLocation } from "@/hooks/use-user-location";
import { readApiJson } from "@/lib/api-json";
import { inNeighborhood } from "@/lib/config";
import { toPublicHouse } from "@/lib/ids";
import { isFrozen, offersGlutenFree } from "@/lib/house-state";
import { notifyCatalogChanged } from "@/lib/offline-db";
import type { Catalog, House, HouseInput, PublicHouse } from "@/lib/types";
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
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [glutenFreeOnly, setGlutenFreeOnly] = useState(false);
  const [likedOnly, setLikedOnly] = useState(false);
  const [followTick, setFollowTick] = useState(0);
  const [askedLocation, setAskedLocation] = useState(false);
  const [adminHouses, setAdminHouses] = useState<House[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  const owned = useOwnedHouses();
  const likes = useLikedHouses();

  const loadAdminHouses = useCallback(async () => {
    if (!admin) return;
    setAdminLoading(true);
    try {
      const res = await fetch("/api/admin/houses", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { houses?: House[] };
      setAdminHouses(data.houses ?? []);
    } catch {
      /* keep last list */
    } finally {
      setAdminLoading(false);
    }
  }, [admin]);

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
    const published = catalog?.houses ?? [];
    const mine = owned
      .map((item) => item.preview)
      .filter((house): house is PublicHouse => Boolean(house))
      .filter((house) => !published.some((p) => p.id === house.id));
    return [...published, ...mine];
  }, [admin, adminHouses, catalog, owned]);

  const visible = useMemo(() => {
    return houses.filter((house) => {
      if (accessibleOnly && !house.accessible) return false;
      if (glutenFreeOnly && !offersGlutenFree(house)) return false;
      if (likedOnly && !likes.likedIds.includes(house.id)) return false;
      return true;
    });
  }, [houses, accessibleOnly, glutenFreeOnly, likedOnly, likes.likedIds]);

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

  function applyAdminHouse(next: House | PublicHouse) {
    const full = "editCode" in next && typeof next.editCode === "string"
      ? (next as House)
      : null;
    if (full) {
      setAdminHouses((list) => {
        const idx = list.findIndex((h) => h.id === full.id);
        if (idx < 0) return [...list, full];
        const copy = [...list];
        copy[idx] = full;
        return copy;
      });
    } else {
      setAdminHouses((list) =>
        list.map((h) => (h.id === next.id ? { ...h, ...next } : h)),
      );
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
    const ok = await patchAdmin(id, { status: "rejected", rejectionReason: "נדחה על ידי מנהל" });
    if (ok) {
      toast.success("הבית נדחה");
      setSelectedId("closed");
    }
  }

  async function saveHouseDetails(input: HouseInput) {
    if (!selected) return;
    const ok = await patchAdmin(selected.id, input);
    if (ok) {
      toast.success("הפרטים נשמרו");
      setEditing(false);
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
              מצב מנהל · {pendingQueue.length} ממתינים לאישור
            </p>
            <span className="text-[11px] text-violet-300">
              לוחצים על בית במפה לעריכה בלי קוד · יציאה רק בכפתור
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
                      {house.address} · קוד {house.editCode}
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
                    דחייה
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[11px] text-violet-300">אין בתים ממתינים. מוקפאים מופיעים במפה כסיכות שקופות.</p>
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
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
          <FilterChip active={accessibleOnly} onClick={() => setAccessibleOnly((v) => !v)}>
            נגיש
          </FilterChip>
          <FilterChip active={glutenFreeOnly} onClick={() => setGlutenFreeOnly((v) => !v)}>
            ללא גלוטן
          </FilterChip>
          <FilterChip active={likedOnly} onClick={() => setLikedOnly((v) => !v)}>
            <Heart className={cn("size-3", likedOnly && "fill-black")} />
            שמרתי
          </FilterChip>
        </div>
        {geoError ? (
          <p className="mt-1 text-[11px] text-amber-200">לא הצלחנו לקרוא מיקום. אשרו גישה למיקום בדפדפן.</p>
        ) : outsideNeighborhood ? (
          <p className="mt-1 text-[11px] text-amber-200">המיקום שלכם מחוץ למפת השכונה — סימנו את הקצה הקרוב.</p>
        ) : null}
      </div>
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
                managerEditCode={admin ? editCodeById.get(selected.id) : undefined}
                extra={
                  admin ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {selected.status === "pending" ? (
                          <>
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
                              דחייה
                            </Button>
                          </>
                        ) : null}
                        <Button
                          variant={editing ? "secondary" : "outline"}
                          disabled={busyAction}
                          onClick={() => setEditing((v) => !v)}
                        >
                          {editing ? "סגירת עריכה" : "עריכה בלי קוד"}
                        </Button>
                      </div>
                      {editing ? (
                        <div className="space-y-3">
                          <NightDesk
                            house={selected}
                            admin
                            editCode={editCodeById.get(selected.id)}
                            onUpdated={(next) => applyAdminHouse(next)}
                          />
                          <HouseForm
                            initial={selected}
                            submitLabel="שמירת פרטי בית"
                            onSubmit={saveHouseDetails}
                            busy={busyAction}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : undefined
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
