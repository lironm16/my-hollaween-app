"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { HouseCardActionContext } from "@/components/house-card-actions";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PersonalMarksSection, type PersonalMarksTab } from "@/components/admin-stats";
import { AppHeader } from "@/components/app-header";
import { HouseEditFlowPanels, useHouseEditFlow } from "@/components/house-edit-flow";
import { HouseList } from "@/components/house-list";
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

function parseTab(raw: string | null, showCollected: boolean): PersonalMarksTab {
  if (raw === "skipped" || raw === "visited" || raw === "saved") return raw;
  if (raw === "collected" && showCollected) return "collected";
  return "mine";
}

function tabUrl(tab: PersonalMarksTab) {
  return tab === "mine" ? "/my" : `/my?tab=${tab}`;
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
  const urlTab = parseTab(searchParams.get("tab"), showCollected);
  const [tab, setTab] = useState<PersonalMarksTab>(urlTab);

  useEffect(() => {
    setTab(urlTab);
  }, [urlTab]);

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

  const mineHouses = useMemo(() => {
    const ids = new Set(owned.map((item) => item.id));
    return owned
      .map((item) => {
        const fromCatalog = catalogHouses.find((house) => house.id === item.id);
        return item.preview ?? fromCatalog ?? null;
      })
      .filter((house): house is PublicHouse => Boolean(house && ids.has(house.id)));
  }, [catalogHouses, owned]);

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

  const housesByTab: Record<PersonalMarksTab, PublicHouse[]> = {
    mine: mineHouses,
    skipped: skippedHouses,
    visited: visitedHouses,
    saved: savedHouses,
    collected: collectedHouses,
  };

  function selectTab(next: PersonalMarksTab) {
    setTab(next);
    window.history.replaceState(window.history.state, "", tabUrl(next));
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

  const actionContext = useMemo((): HouseCardActionContext => {
    return {
      catalogSource: catalog ? "network" : null,
      liked: likes.liked,
      visited: visits.visited,
      skipped: skips.skipped,
      gemCollected: showCollected ? gems.collected : undefined,
      onToggleLike: (id) => likes.toggle(id),
      onToggleVisited: (id) => visits.toggle(id),
      onSkip: tab === "visited" ? (id) => skips.toggle(id) : undefined,
      onRestore:
        tab === "skipped"
          ? (id) => {
              handleRestore(id);
            }
          : undefined,
      canEdit: tab === "mine" ? () => true : undefined,
      onEdit: tab === "mine" ? requestEdit : undefined,
      skipMetaFor: (id) => skips.meta(id),
      editingId: editFlow.flow?.house.id ?? null,
      onShowOnMap: (id) => router.push(`/?focus=${encodeURIComponent(id)}`),
    };
  }, [
    catalog,
    likes,
    visits,
    skips,
    showCollected,
    gems,
    tab,
    editFlow.flow?.house.id,
    router,
  ]);

  const emptyKind =
    tab === "mine"
      ? "mine"
      : tab === "skipped"
        ? "skipped"
        : tab === "visited"
          ? "visited"
          : tab === "saved"
            ? "saved"
            : "collected";

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto bg-[#12081a]">
        <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-5 pb-10">
          <h1 className="font-display text-2xl text-orange-300">במכשיר שלי</h1>

          <PersonalMarksSection
            ownedCount={owned.length}
            likedCount={likes.likedIds.length}
            visitedCount={visits.visitedIds.length}
            skippedCount={skips.skippedIds.length}
            gemCollectedCount={gems.collectedIds.length}
            showGemStats={showCollected}
            selectedTab={tab}
            onSelectTab={selectTab}
          />

          <HouseList
            houses={housesByTab[tab]}
            origin={origin}
            actionContext={actionContext}
            emptyKind={emptyKind}
            showSort={tab !== "mine"}
            onRemoveFromDevice={
              tab === "mine"
                ? (id) => {
                    removeOwnedHouse(id);
                    notifyCatalogChanged();
                  }
                : undefined
            }
            emptyAction={
              tab === "mine" ? (
                <Link
                  href="/add"
                  className={cn(buttonVariants(), "mt-4 inline-flex bg-orange-500 text-black hover:bg-orange-400")}
                >
                  הוספת בית
                </Link>
              ) : undefined
            }
          />
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
