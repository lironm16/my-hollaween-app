"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { HouseCard } from "@/components/house-card";
import { HouseEditFlowPanels, useHouseEditFlow } from "@/components/house-edit-flow";
import { HouseList } from "@/components/house-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicHouse } from "@/lib/types";

type MyTab = "mine" | "skipped" | "visited" | "saved" | "collected";

function parseTab(raw: string | null, showCollected: boolean): MyTab {
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

  function setTab(next: MyTab) {
    const query = next === "mine" ? "/my" : `/my?tab=${next}`;
    router.replace(query);
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
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto bg-[#12081a]">
        <div className="mx-auto w-full max-w-3xl px-3 pt-3">
          <h1 className="font-display mb-3 text-2xl text-orange-300">שלי</h1>
          <Tabs value={tab} onValueChange={(value) => setTab(value as MyTab)} className="gap-3">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-[#1a1028] p-1 ring-1 ring-violet-500/25 sm:grid-cols-3">
              <TabsTrigger value="mine" className="text-sm data-active:bg-orange-500/20">
                שלי {owned.length > 0 ? `(${owned.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="skipped" className="text-sm data-active:bg-orange-500/20">
                דילגתי {skips.skippedIds.length > 0 ? `(${skips.skippedIds.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="visited" className="text-sm data-active:bg-orange-500/20">
                ביקרתי {visits.visitedIds.length > 0 ? `(${visits.visitedIds.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="saved" className="text-sm data-active:bg-orange-500/20">
                שמרו {likes.likedIds.length > 0 ? `(${likes.likedIds.length})` : ""}
              </TabsTrigger>
              {showCollected ? (
                <TabsTrigger value="collected" className="text-sm data-active:bg-amber-500/20 sm:col-span-2">
                  אספתי {gems.collectedIds.length > 0 ? `(${gems.collectedIds.length})` : ""}
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="mine" className="mt-0 outline-none">
              {mineHouses.length === 0 ? (
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
                <div className="flex flex-col gap-3 pb-8">
                  {mineHouses.map(({ house, distanceM }, index) => (
                    <div key={house.id} className="space-y-1">
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
                      <button
                        type="button"
                        className="px-1 text-sm text-violet-400 underline-offset-2 hover:text-violet-200 hover:underline"
                        onClick={() => {
                          removeOwnedHouse(house.id);
                          notifyCatalogChanged();
                        }}
                      >
                        הסרה מהרשימה
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="skipped" className="mt-0 outline-none">
              {skips.skippedIds.length > 0 ? (
                <div className="mb-2 flex justify-end px-1">
                  <button
                    type="button"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-orange-400/40")}
                    onClick={handleRestoreAll}
                  >
                    החזרת כל הבתים
                  </button>
                </div>
              ) : null}
              <HouseList
                {...listProps}
                houses={skippedHouses}
                onRestoreHouse={handleRestore}
                onSkipHouse={(id) => skips.unskip(id)}
                emptyKind="skipped"
              />
            </TabsContent>

            <TabsContent value="visited" className="mt-0 outline-none">
              <HouseList
                {...listProps}
                houses={visitedHouses}
                onSkipHouse={(id) => skips.toggle(id)}
                emptyKind="visited"
              />
            </TabsContent>

            <TabsContent value="saved" className="mt-0 outline-none">
              <HouseList {...listProps} houses={savedHouses} emptyKind="saved" />
            </TabsContent>

            {showCollected ? (
              <TabsContent value="collected" className="mt-0 outline-none">
                <HouseList {...listProps} houses={collectedHouses} emptyKind="collected" />
              </TabsContent>
            ) : null}
          </Tabs>
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
