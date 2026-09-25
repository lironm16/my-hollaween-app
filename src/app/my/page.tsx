"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PersonalMarksSection, type PersonalMarksTab } from "@/components/admin-stats";
import { AppHeader } from "@/components/app-header";
import { HouseCard } from "@/components/house-card";
import { HouseEditFlowPanels, useHouseEditFlow } from "@/components/house-edit-flow";
import { HouseList } from "@/components/house-list";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useAppNow } from "@/hooks/use-app-clock";
import { useCatalog } from "@/hooks/use-catalog";
import { useDistanceOrigin } from "@/hooks/use-distance-origin";
import { useGemProgress } from "@/hooks/use-gem-progress";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { useSkippedHouses } from "@/hooks/use-skipped-houses";
import { useUserLocation } from "@/hooks/use-user-location";
import { useVisitedHouses } from "@/hooks/use-visited-houses";
import { gemBagMenuVisible } from "@/lib/gem-hunt-enabled";
import { distanceMeters } from "@/lib/geo";
import {
  forgetPublishedHouse,
  notifyCatalogChanged,
  removeOwnedHouse,
  saveOwnedHouse,
} from "@/lib/offline-db";
import { queueRouteRestore, readRouteMode } from "@/lib/route-mode";
import { cn } from "@/lib/utils";
import type { PublicHouse } from "@/lib/types";

function parseTab(raw: string | null, showCollected: boolean): PersonalMarksTab {
  if (raw === "skipped" || raw === "visited" || raw === "saved") return raw;
  if (raw === "collected" && showCollected) return "collected";
  return "mine";
}

export default function MyCollectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#12081a] text-orange-200">טוענים…</div>
      }
    >
      <MyCollectionsPageContent />
    </Suspense>
  );
}

function MyCollectionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { admin } = useAdminSession();
  const now = useAppNow();
  const showCollected = gemBagMenuVisible(admin, now);
  const tab = parseTab(searchParams.get("tab"), showCollected);

  const owned = useOwnedHouses();
  const skips = useSkippedHouses();
  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const gems = useGemProgress();
  const { catalog, refresh } = useCatalog();
  const geo = useUserLocation();
  const { resolved: origin } = useDistanceOrigin(geo.location);
  const editFlow = useHouseEditFlow();

  const catalogHouses = catalog?.houses ?? [];

  const mineHouses = useMemo(
    () =>
      owned
        .map((item) => {
          const fromCatalog = catalogHouses.find((house) => house.id === item.id);
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
    [catalogHouses, owned, origin],
  );

  const skippedHouses = useMemo(() => {
    const ids = new Set(skips.skippedIds);
    return catalogHouses.filter((house) => ids.has(house.id));
  }, [catalogHouses, skips.skippedIds]);

  const visitedHouses = useMemo(() => {
    const ids = new Set(visits.visitedIds);
    return visits.visitedIds
      .map((id) => catalogHouses.find((house) => house.id === id))
      .filter((house): house is PublicHouse => Boolean(house && ids.has(house.id)));
  }, [catalogHouses, visits.visitedIds]);

  const savedHouses = useMemo(() => {
    const ids = new Set(likes.likedIds);
    return likes.likedIds
      .map((id) => catalogHouses.find((house) => house.id === id))
      .filter((house): house is PublicHouse => Boolean(house && ids.has(house.id)));
  }, [catalogHouses, likes.likedIds]);

  const collectedHouses = useMemo(() => {
    if (!showCollected) return [];
    return catalogHouses.filter((house) => gems.collected(house.id));
  }, [catalogHouses, gems, showCollected]);

  function setTab(next: PersonalMarksTab) {
    const query = next === "mine" ? "/my" : `/my?tab=${next}`;
    router.replace(query, { scroll: false });
  }

  function requestEdit(house: PublicHouse) {
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

  function handleRestore(id: string) {
    skips.unskip(id);
    if (readRouteMode()) queueRouteRestore(id);
  }

  function handleRestoreAll() {
    if (skips.skippedIds.length === 0) return;
    if (readRouteMode()) {
      for (const id of skips.skippedIds) queueRouteRestore(id);
    }
    skips.unskipAll();
  }

  const listProps = {
    origin,
    catalogSource: catalog ? "network" : null,
    likedIds: likes.likedIds,
    onToggleLike: (id: string) => likes.toggle(id),
    visitedIds: visits.visitedIds,
    onToggleVisited: (id: string) => visits.toggle(id),
    gemCollected: (id: string) => gems.collected(id),
    skipMetaFor: (id: string) => skips.meta(id),
    skippedIds: skips.skippedIds,
  };

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto bg-[#12081a]">
        <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-5 pb-10">
          <h1 className="font-display text-2xl text-orange-300">שלי</h1>

          <PersonalMarksSection
            ownedCount={owned.length}
            likedCount={likes.likedIds.length}
            visitedCount={visits.visitedIds.length}
            skippedCount={skips.skippedIds.length}
            gemCollectedCount={gems.collectedIds.length}
            showGemStats={showCollected}
            selectedTab={tab}
            onSelectTab={setTab}
          />

          {tab === "mine" ? (
            mineHouses.length === 0 ? (
              <div className="px-1 py-6 text-center text-violet-200">
                <p className="text-base">אין בתים שהוספתם מהמכשיר הזה.</p>
                <Link
                  href="/add"
                  className={cn(buttonVariants(), "mt-4 inline-flex bg-orange-500 text-black hover:bg-orange-400")}
                >
                  הוספת בית
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {mineHouses.map(({ house, distanceM }, index) => (
                  <div key={house.id} className="space-y-2">
                    <HouseCard
                      index={index + 1}
                      house={house}
                      distanceM={distanceM}
                      catalogSource={listProps.catalogSource}
                      liked={likes.liked(house.id)}
                      onToggleLike={() => likes.toggle(house.id)}
                      visited={visits.visited(house.id)}
                      onToggleVisited={() => visits.toggle(house.id)}
                      gemCollected={gems.collected(house.id)}
                      canEdit
                      onToggleEdit={() => requestEdit(house)}
                    />
                    <div className="px-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 w-full border-violet-500/35 bg-[#1d1028]/80 text-base text-violet-100 hover:bg-violet-500/10"
                        onClick={() => {
                          removeOwnedHouse(house.id);
                          notifyCatalogChanged();
                        }}
                      >
                        הסר מהמכשיר
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : tab === "skipped" ? (
            <>
              {skips.skippedIds.length > 0 ? (
                <div className="flex justify-end px-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-orange-400/40"
                    onClick={handleRestoreAll}
                  >
                    החזרת כל הבתים
                  </Button>
                </div>
              ) : null}
              <HouseList
                {...listProps}
                houses={skippedHouses}
                onRestoreHouse={handleRestore}
                onSkipHouse={(id) => skips.unskip(id)}
                emptyKind="skipped"
              />
            </>
          ) : tab === "visited" ? (
            <HouseList
              {...listProps}
              houses={visitedHouses}
              onSkipHouse={(id) => skips.toggle(id)}
              emptyKind="visited"
            />
          ) : tab === "saved" ? (
            <HouseList {...listProps} houses={savedHouses} emptyKind="saved" />
          ) : (
            <HouseList {...listProps} houses={collectedHouses} emptyKind="collected" />
          )}
        </div>
      </main>
      <HouseEditFlowPanels
        flow={editFlow.flow}
        setFlow={editFlow.setFlow}
        onClose={editFlow.close}
        onUpdated={handleUpdated}
        onDeleted={(id) => {
          forgetPublishedHouse(id);
          removeOwnedHouse(id);
          editFlow.close();
          notifyCatalogChanged();
          void refresh(true);
        }}
      />
    </div>
  );
}
