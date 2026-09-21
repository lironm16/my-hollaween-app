"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { HouseList } from "@/components/house-list";
import { useCatalog } from "@/hooks/use-catalog";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useSkippedHouses } from "@/hooks/use-skipped-houses";
import { useVisitedHouses } from "@/hooks/use-visited-houses";
import { useDistanceOrigin } from "@/hooks/use-distance-origin";
import { useUserLocation } from "@/hooks/use-user-location";
import { Button, buttonVariants } from "@/components/ui/button";
import { queueRouteRestore, readRouteMode } from "@/lib/route-mode";
import { cn } from "@/lib/utils";

export default function SkippedHousesPage() {
  const router = useRouter();
  const skips = useSkippedHouses();
  const { catalog } = useCatalog();
  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const geo = useUserLocation();
  const { resolved: origin } = useDistanceOrigin(geo.location);

  const houses = useMemo(() => {
    const ids = new Set(skips.skippedIds);
    return (catalog?.houses ?? []).filter((house) => ids.has(house.id));
  }, [catalog?.houses, skips.skippedIds]);

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

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto bg-[#12081a]">
        <div className="mx-auto w-full max-w-3xl px-3 pt-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-display text-2xl text-orange-300">דילגתי</h1>
            {skips.skippedIds.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                className="border-orange-400/40 text-orange-100 hover:bg-orange-500/10"
                onClick={handleRestoreAll}
              >
                החזרת כל הבתים
              </Button>
            ) : null}
          </div>
          {skips.skippedIds.length === 0 ? (
            <div className="px-1 py-8">
              <p className="text-base text-violet-200">אין בתים שדילגתם עליהם.</p>
              <p className="mt-2 text-sm text-violet-400">בתים שדילגתם עליהם יופיעו כאן.</p>
              <Link
                href="/"
                className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex border-orange-400/40 text-orange-100")}
              >
                חזרה למפה
              </Link>
            </div>
          ) : (
            <HouseList
              houses={houses}
              origin={origin}
              catalogSource={catalog ? "network" : null}
              likedIds={likes.likedIds}
              onToggleLike={(id) => likes.toggle(id)}
              visitedIds={visits.visitedIds}
              onToggleVisited={(id) => visits.toggle(id)}
              skippedIds={skips.skippedIds}
              skipMetaFor={(id) => skips.meta(id)}
              onRestoreHouse={handleRestore}
              emptyKind="skipped"
              onShowOnMap={(id) => router.push(`/?focus=${encodeURIComponent(id)}`)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
