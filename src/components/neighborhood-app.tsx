"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, List, MapPinned, RefreshCw, WifiOff } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { FilterChip } from "@/components/filter-chip";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { HouseList } from "@/components/house-list";
import { HouseDetails } from "@/components/house-details";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCatalog } from "@/hooks/use-catalog";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { distanceMeters, NEARBY_METERS } from "@/lib/geo";
import { isFrozen, offersGlutenFree } from "@/lib/house-state";
import type { Catalog, PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NeighborhoodApp({
  initialCatalog,
  focusId = null,
}: {
  initialCatalog: Catalog;
  focusId?: string | null;
}) {
  const { catalog, loading, offline, error, source, refresh } = useCatalog(initialCatalog);
  const [view, setView] = useState<"map" | "list">("map");
  const [selectedId, setSelectedId] = useState<string | "closed" | null>(null);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [glutenFreeOnly, setGlutenFreeOnly] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [likedOnly, setLikedOnly] = useState(false);
  const [geoError, setGeoError] = useState(false);

  const owned = useOwnedHouses();
  const likes = useLikedHouses();

  useEffect(() => {
    locate(false);
  }, []);

  const houses = useMemo(() => {
    const published = catalog?.houses ?? [];
    const mine = owned
      .map((item) => item.preview)
      .filter((house): house is PublicHouse => Boolean(house))
      .filter((house) => !published.some((p) => p.id === house.id));
    return [...published, ...mine];
  }, [catalog, owned]);

  const visible = useMemo(() => {
    return houses.filter((house) => {
      if (accessibleOnly && !house.accessible) return false;
      if (glutenFreeOnly && !offersGlutenFree(house)) return false;
      if (likedOnly && !likes.likedIds.includes(house.id)) return false;
      if (nearbyOnly) {
        if (!origin) return false;
        if (distanceMeters(origin, house) > NEARBY_METERS) return false;
      }
      return true;
    });
  }, [houses, accessibleOnly, glutenFreeOnly, likedOnly, nearbyOnly, origin, likes.likedIds]);

  const activeId = selectedId === "closed" ? null : (selectedId ?? focusId);
  const selected = visible.find((house) => house.id === activeId) ?? houses.find((house) => house.id === activeId) ?? null;

  function locate(fromUser: boolean) {
    if (!navigator.geolocation) {
      if (fromUser) setGeoError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError(false);
      },
      () => {
        if (fromUser) setGeoError(true);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }

  function toggleNearby() {
    const next = !nearbyOnly;
    setNearbyOnly(next);
    if (next && !origin) locate(true);
  }

  return (
    <div className="relative isolate flex h-dvh flex-col overflow-hidden">
      <AppHeader
        actions={
          <>
            <Link
              href="/edit"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
            >
              עריכת בית
            </Link>
            <Link
              href="/admin"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-violet-200")}
            >
              ניהול
            </Link>
          </>
        }
      />
      <div className="relative z-40 border-b border-orange-500/15 bg-[#12081a]/80 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-[#1d1028] p-0.5 ring-1 ring-orange-500/20">
            <Toggle active={view === "map"} onClick={() => setView("map")} icon={<MapPinned className="size-3.5" />}>
              מפה
            </Toggle>
            <Toggle active={view === "list"} onClick={() => setView("list")} icon={<List className="size-3.5" />}>
              רשימה
            </Toggle>
          </div>
          <Button size="sm" variant="ghost" onClick={() => void refresh(true)}>
            <RefreshCw className="size-3.5" />
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
          <FilterChip active={nearbyOnly} onClick={toggleNearby}>
            קרוב
          </FilterChip>
          <FilterChip active={likedOnly} onClick={() => setLikedOnly((v) => !v)}>
            <Heart className={cn("size-3", likedOnly && "fill-black")} />
            שמרתי
          </FilterChip>
        </div>
        {nearbyOnly && geoError ? (
          <p className="mt-1 text-[11px] text-amber-200">לא הצלחנו לקרוא מיקום. אשרו גישה למיקום כדי לסנן ולמיין לפי מרחק.</p>
        ) : null}
      </div>
      {error ? (
        <div className="relative z-30 bg-red-950/70 px-3 py-2 text-center text-sm text-red-100">
          {error}
        </div>
      ) : null}
      <main className="relative z-0 min-h-0 flex-1 isolate">
        {loading && houses.length === 0 ? (
          <div className="flex h-full items-center justify-center text-orange-200">
            מדליקים דלעות…
          </div>
        ) : (
          <>
            <div
              className={cn(
                "absolute inset-0",
                view !== "map" && "invisible pointer-events-none",
              )}
              aria-hidden={view !== "map"}
            >
              <HouseMapDynamic
                houses={visible}
                selectedId={selected?.id}
                onSelect={(house) => setSelectedId(house.id)}
                className="h-full w-full"
                active={view === "map"}
              />
            </div>
            {view === "list" ? (
              <div className="absolute inset-0 overflow-y-auto bg-[#12081a]">
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
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto bg-[#1a0d24] sm:max-w-none">
            <SheetHeader>
              <SheetTitle className="sr-only">פרטי בית</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-8">
              {selected.status === "pending" ? (
                <p className="mb-3 rounded-lg bg-violet-950/70 px-3 py-2 text-sm text-violet-100">
                  הבית הזה עדיין לא במפה הציבורית. אם זה הבית שלכם, מנהל יכול לאשר אותו.
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
