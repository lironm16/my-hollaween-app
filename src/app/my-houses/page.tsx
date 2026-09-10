"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { HouseCard } from "@/components/house-card";
import { HouseDetailOverlay } from "@/components/house-detail-overlay";
import { HouseEditFlowPanels, useHouseEditFlow } from "@/components/house-edit-flow";
import { useCatalog } from "@/hooks/use-catalog";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { useVisitedHouses } from "@/hooks/use-visited-houses";
import { useDistanceOrigin } from "@/hooks/use-distance-origin";
import { useUserLocation } from "@/hooks/use-user-location";
import { distanceMeters } from "@/lib/geo";
import {
  forgetPublishedHouse,
  notifyCatalogChanged,
  removeOwnedHouse,
  saveOwnedHouse,
} from "@/lib/offline-db";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicHouse } from "@/lib/types";

export default function MyHousesPage() {
  const owned = useOwnedHouses();
  const { catalog, refresh } = useCatalog();
  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const geo = useUserLocation();
  const { resolved: origin } = useDistanceOrigin(geo.location);
  const editFlow = useHouseEditFlow();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const houses = useMemo(
    () =>
      owned
        .map((item) => {
          const fromCatalog = catalog?.houses.find((house) => house.id === item.id);
          return item.preview ?? fromCatalog ?? null;
        })
        .filter((house): house is PublicHouse => Boolean(house))
        .map((house) => ({
          house,
          distanceM: origin ? distanceMeters(origin, house) : undefined,
        }))
        .sort((a, b) => {
          if (a.distanceM !== undefined && b.distanceM !== undefined) return a.distanceM - b.distanceM;
          return a.house.name.localeCompare(b.house.name, "he");
        }),
    [catalog?.houses, owned, origin],
  );

  const selected = houses.find((item) => item.house.id === selectedId)?.house ?? null;
  const selectedIndex = selected
    ? houses.findIndex((item) => item.house.id === selectedId) + 1
    : undefined;

  function requestEdit(house: PublicHouse) {
    setSelectedId(null);
    editFlow.openEdit(house, {
      editCode: owned.find((item) => item.id === house.id)?.editCode,
      allowDelete: true,
    });
  }

  function handleUpdated(next: PublicHouse) {
    editFlow.setFlow((current) =>
      current?.house.id === next.id ? { ...current, house: next } : current,
    );
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
        <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-3 px-3 py-3 pb-8">
          {houses.map(({ house, distanceM }, index) => (
            <HouseCard
              key={house.id}
              index={index + 1}
              house={house}
              distanceM={distanceM}
              catalogSource={catalog ? "network" : null}
              liked={likes.likedIds.includes(house.id)}
              onToggleLike={() => likes.toggle(house.id)}
              visited={visits.visitedIds.includes(house.id)}
              onToggleVisited={() => visits.toggle(house.id)}
              canEdit
              onOpen={() => setSelectedId(house.id)}
              onToggleEdit={() => requestEdit(house)}
            />
          ))}
        </div>
      </main>
      {selected && !editFlow.flow ? (
        <HouseDetailOverlay
          house={selected}
          index={selectedIndex}
          onClose={() => setSelectedId(null)}
          liked={likes.liked}
          onToggleLike={(id) => likes.toggle(id)}
          visited={visits.visited}
          onToggleVisited={(id) => visits.toggle(id)}
          catalogSource={catalog ? "network" : null}
          canEditHouse={() => true}
          onToggleEdit={() => requestEdit(selected)}
        />
      ) : null}
      <HouseEditFlowPanels
        flow={editFlow.flow}
        setFlow={editFlow.setFlow}
        onClose={editFlow.close}
        onUpdated={handleUpdated}
        onDeleted={(id) => {
          forgetPublishedHouse(id);
          removeOwnedHouse(id);
          editFlow.close();
          setSelectedId(null);
          notifyCatalogChanged();
          void refresh(true);
        }}
      />
    </div>
  );
}
