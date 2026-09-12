"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { HouseList } from "@/components/house-list";
import { HouseDetailOverlay } from "@/components/house-detail-overlay";
import { useCatalog } from "@/hooks/use-catalog";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useSkippedHouses } from "@/hooks/use-skipped-houses";
import { useVisitedHouses } from "@/hooks/use-visited-houses";
import { useDistanceOrigin } from "@/hooks/use-distance-origin";
import { useUserLocation } from "@/hooks/use-user-location";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SkippedHousesPage() {
  const router = useRouter();
  const skips = useSkippedHouses();
  const { catalog } = useCatalog();
  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const geo = useUserLocation();
  const { resolved: origin } = useDistanceOrigin(geo.location);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const houses = useMemo(() => {
    const ids = new Set(skips.skippedIds);
    return (catalog?.houses ?? []).filter((house) => ids.has(house.id));
  }, [catalog?.houses, skips.skippedIds]);

  const selected = houses.find((house) => house.id === selectedId) ?? null;
  const selectedIndex = selected
    ? houses.findIndex((house) => house.id === selectedId) + 1
    : undefined;

  function handleRestore(id: string) {
    skips.unskip(id);
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto bg-[#12081a]">
        <div className="mx-auto w-full max-w-3xl px-3 pt-3">
          <h1 className="font-display mb-2 text-2xl text-orange-300">דילגתי</h1>
          {skips.skippedIds.length === 0 ? (
            <div className="px-1 py-8">
              <p className="text-base text-violet-200">אין בתים שדילגתם עליהם.</p>
              <p className="mt-2 text-sm text-violet-400">בתים שתדלגו עליהם במסלול יופיעו כאן.</p>
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
              onRestoreHouse={handleRestore}
              emptyKind="skipped"
              onShowOnMap={(id) => router.push(`/?focus=${encodeURIComponent(id)}`)}
              onSelectHouse={(id) => setSelectedId(id)}
              selectedId={selectedId}
            />
          )}
        </div>
      </main>
      {selected ? (
        <HouseDetailOverlay
          house={selected}
          index={selectedIndex}
          onClose={() => setSelectedId(null)}
          liked={likes.liked}
          onToggleLike={(id) => likes.toggle(id)}
          visited={visits.visited}
          onToggleVisited={(id) => visits.toggle(id)}
          catalogSource={catalog ? "network" : null}
          skipped
          onRestoreRoute={() => handleRestore(selected.id)}
          onShowOnMap={() => router.push(`/?focus=${encodeURIComponent(selected.id)}`)}
        />
      ) : null}
    </div>
  );
}
