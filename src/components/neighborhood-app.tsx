"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { List, MapPinned, RefreshCw, WifiOff } from "lucide-react";
import { AppHeader } from "@/components/app-header";
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
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { isFrozen } from "@/lib/house-state";
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

  const owned = useOwnedHouses();
  const houses = useMemo(() => {
    const published = catalog?.houses ?? [];
    const mine = owned
      .map((item) => item.preview)
      .filter((house): house is PublicHouse => Boolean(house))
      .filter((house) => !published.some((p) => p.id === house.id));
    const merged = [...published, ...mine];
    if (!accessibleOnly) return merged;
    return merged.filter((house) => house.accessible);
  }, [catalog, accessibleOnly, owned]);

  const activeId = selectedId === "closed" ? null : (selectedId ?? focusId);
  const selected = houses.find((house) => house.id === activeId) ?? null;

  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
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
      <div className="relative z-40 flex items-center gap-2 border-b border-orange-500/15 bg-[#12081a]/80 px-3 py-2">
        <div className="flex rounded-lg bg-[#1d1028] p-0.5 ring-1 ring-orange-500/20">
          <Toggle active={view === "map"} onClick={() => setView("map")} icon={<MapPinned className="size-3.5" />}>
            מפה
          </Toggle>
          <Toggle active={view === "list"} onClick={() => setView("list")} icon={<List className="size-3.5" />}>
            רשימה
          </Toggle>
        </div>
        <button
          type="button"
          onClick={() => setAccessibleOnly((v) => !v)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs",
            accessibleOnly
              ? "bg-orange-500 text-black"
              : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25",
          )}
        >
          נגיש
        </button>
        <Button size="sm" variant="ghost" onClick={() => void refresh(true)}>
          <RefreshCw className="size-3.5" />
          רענון
        </Button>
        <Button size="sm" variant="ghost" onClick={locate}>
          לידי
        </Button>
        <span className="ms-auto flex items-center gap-1 text-[11px] text-violet-300">
          {offline || source === "cache" || source === "snapshot" ? (
            <>
              <WifiOff className="size-3" />
              {offline ? "לא מקוון" : source === "snapshot" ? "עותק סטטי" : "מהזיכרון"}
            </>
          ) : (
            <span>{houses.length} בתים</span>
          )}
        </span>
      </div>
      {error ? (
        <div className="relative z-30 bg-red-950/70 px-3 py-2 text-center text-sm text-red-100">
          {error}
        </div>
      ) : null}
      <main className="relative z-0 min-h-0 flex-1 isolate overflow-hidden">
        {loading && houses.length === 0 ? (
          <div className="flex h-full min-h-[60vh] items-center justify-center text-orange-200">
            מדליקים דלעות…
          </div>
        ) : view === "map" ? (
          <HouseMapDynamic
            houses={houses}
            selectedId={selected?.id}
            onSelect={(house) => setSelectedId(house.id)}
            className="h-full w-full"
          />
        ) : (
          <div className="h-full overflow-y-auto">
            <HouseList houses={houses} onOpen={(house) => setSelectedId(house.id)} origin={origin} />
          </div>
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
                  הבית שלכם ממתין לאישור מנהל. רק אתם רואים אותו במפה בינתיים.
                </p>
              ) : null}
              {isFrozen(selected) ? (
                <p className="mb-3 rounded-lg bg-[#2a1638] px-3 py-2 text-sm text-amber-100">
                  הבית מוקפא — הילדים בשכונה לא רואים אותו. רק אתם (או מנהל) רואים את הסיכה השקופה.
                </p>
              ) : null}
              <HouseDetails house={selected} />
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
