"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { HouseList } from "@/components/house-list";
import { MapHouseSheet } from "@/components/map-house-sheet";
import { useCatalog } from "@/hooks/use-catalog";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { useVisitedHouses } from "@/hooks/use-visited-houses";
import { useDistanceOrigin } from "@/hooks/use-distance-origin";
import { useUserLocation } from "@/hooks/use-user-location";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicHouse } from "@/lib/types";

export default function MyHousesPage() {
  const owned = useOwnedHouses();
  const { catalog } = useCatalog();
  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const geo = useUserLocation();
  const { resolved: origin } = useDistanceOrigin(geo.location);
  const [selectedId, setSelectedId] = useState<string | "closed" | null>(null);
  const [selectedListIndex, setSelectedListIndex] = useState<number | undefined>();

  const houses = useMemo(
    () =>
      owned
        .map((item) => {
          const fromCatalog = catalog?.houses.find((house) => house.id === item.id);
          return item.preview ?? fromCatalog ?? null;
        })
        .filter((house): house is PublicHouse => Boolean(house)),
    [catalog?.houses, owned],
  );

  const selected = houses.find((house) => house.id === selectedId) ?? null;

  if (owned.length === 0) {
    return (
      <div className="relative flex min-h-dvh flex-col">
        <AppHeader />
        <main className="relative z-10 mx-auto w-full max-w-lg flex-1 px-4 py-5">
          <h1 className="font-display mb-2 text-2xl text-orange-300">הבתים שלי</h1>
          <p className="text-base text-violet-200">אין בתים שמורים במכשיר הזה.</p>
          <Link href="/add" className={cn(buttonVariants(), "mt-4 inline-flex bg-orange-500 text-black hover:bg-orange-400")}>
            הוספת בית
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto bg-[#12081a]">
        <div className="mx-auto w-full max-w-3xl px-3 pt-3">
          <h1 className="font-display mb-2 text-2xl text-orange-300">הבתים שלי</h1>
        </div>
        <HouseList
          houses={houses}
          origin={origin}
          catalogSource={catalog ? "network" : null}
          likedIds={likes.likedIds}
          onToggleLike={(id) => likes.toggle(id)}
          visitedIds={visits.visitedIds}
          onToggleVisited={(id) => visits.toggle(id)}
          canEditHouse={(id) => owned.some((item) => item.id === id)}
          onSelectHouse={(id, index) => {
            setSelectedListIndex(index);
            setSelectedId(id);
          }}
          onEditHouse={(id, index) => {
            window.location.href = `/edit?focus=${encodeURIComponent(id)}`;
            setSelectedListIndex(index);
            setSelectedId(id);
          }}
          selectedId={selected?.id ?? null}
        />
      </main>
      {selected ? (
        <MapHouseSheet
          house={selected}
          clusterHouses={[selected]}
          onClose={() => setSelectedId("closed")}
          liked={likes.liked}
          onToggleLike={likes.toggle}
          visited={visits.visited}
          onToggleVisited={visits.toggle}
          canEditHouse={(id) => owned.some((item) => item.id === id)}
          editCodeFor={(id) => owned.find((item) => item.id === id)?.editCode}
          index={selectedListIndex}
        />
      ) : null}
    </div>
  );
}
