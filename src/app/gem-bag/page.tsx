"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { GemStickerAlbum } from "@/components/gem-hunt/gem-sticker-album";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useGemProgress } from "@/hooks/use-gem-progress";
import { resolveCatalogHouses } from "@/lib/catalog-houses";
import { gemHuntVisible } from "@/lib/gem-hunt-enabled";
import { gemHuntMapHouses } from "@/lib/gem-monsters";
import { catalogHasRealHouses } from "@/lib/house-set";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function GemBagPage() {
  const { admin, ready } = useAdminSession();
  const { catalog, loading } = useCatalog();
  const gems = useGemProgress();
  const visible = gemHuntVisible(admin);

  const mapHouses = useMemo(
    () => gemHuntMapHouses(resolveCatalogHouses(catalog), "real"),
    [catalog],
  );

  if (!ready) {
    return (
      <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden bg-[#0f0818]">
        <AppHeader />
        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <p className="text-base text-violet-300">טוענים…</p>
        </main>
      </div>
    );
  }

  if (!visible) {
    return (
      <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden bg-[#0f0818]">
        <AppHeader />
        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div className="mx-auto max-w-lg space-y-4">
            <h1 className="font-display text-2xl text-orange-300">ספר המדבקות</h1>
            <p className="text-base text-violet-200">הציד עדיין לא פתוח לכולם.</p>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              חזרה למפה
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const hasHouses = mapHouses.length > 0 || catalogHasRealHouses(catalog);

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden bg-[#0f0818]">
      <AppHeader />
      <main
        className={cn(
          "relative z-10 min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4",
          "bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgb(76_29_149_/_0.35),transparent_55%)]",
        )}
      >
        <Link
          href="/"
          className="gem-sticker-album-back mb-3 inline-block text-sm text-violet-300/90 hover:text-amber-200"
        >
          ← חזרה למפה
        </Link>
        {loading && !hasHouses ? (
          <p className="text-base text-violet-300">טוענים נתונים…</p>
        ) : mapHouses.length === 0 ? (
          <p className="text-base text-violet-300">אין בתים על המפה עדיין.</p>
        ) : (
          <GemStickerAlbum mapHouses={mapHouses} collected={gems.entries} />
        )}
      </main>
    </div>
  );
}
