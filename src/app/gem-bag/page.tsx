"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Gem, MapPinned, Navigation, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { GemBagOrbitViewer } from "@/components/gem-hunt/gem-bag-orbit-viewer";
import { GemSprite } from "@/components/gem-hunt/gem-sprite";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useGemProgress } from "@/hooks/use-gem-progress";
import { formatDisplayAddress } from "@/lib/config";
import { gemHuntVisible } from "@/lib/gem-hunt-enabled";
import {
  achievementProgress,
  countGemEligibleHouses,
  GEM_ACHIEVEMENTS,
  gemLabelHe,
  gemMonsterForHouse,
  gemSpeciesLabelHe,
} from "@/lib/gem-hunt";
import { houseHeadline } from "@/lib/labels";
import { houseMapsUrl, houseSharePath } from "@/lib/nav-links";
import type { PublicHouse } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BagFilter = "all" | "collected" | "missing";

function formatCollectedWhen(ms: number) {
  try {
    return new Intl.DateTimeFormat("he-IL", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return "";
  }
}

function GemBagContent({ houses, isAdmin }: { houses: PublicHouse[]; isAdmin: boolean }) {
  const gems = useGemProgress();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("house") ?? searchParams.get("focus");
  const [filter, setFilter] = useState<BagFilter>("all");

  const eligible = useMemo(
    () =>
      [...houses].sort((a, b) => {
        const aCollected = gems.collected(a.id);
        const bCollected = gems.collected(b.id);
        if (aCollected !== bCollected) return aCollected ? -1 : 1;
        return formatDisplayAddress(a).localeCompare(formatDisplayAddress(b), "he");
      }),
    [houses, gems.collectedIds],
  );

  const total = countGemEligibleHouses(eligible);
  const collectedCount = gems.collectedIds.length;
  const progressPct = total > 0 ? Math.round((collectedCount / total) * 100) : 0;
  const allDone = total > 0 && collectedCount >= total;
  const housesById = useMemo(() => new Map(eligible.map((h) => [h.id, h])), [eligible]);
  const collectedAt = useMemo(
    () => new Map(gems.entries.map((e) => [e.houseId, e.collectedAt])),
    [gems.entries],
  );

  const defaultPreview = useMemo(() => {
    if (focusId) {
      const focused = eligible.find((h) => h.id === focusId);
      if (focused) return focused;
    }
    const collectedHouse = eligible.find((h) => gems.collected(h.id));
    return collectedHouse ?? eligible[0] ?? null;
  }, [eligible, focusId, gems.collectedIds]);

  const [previewHouse, setPreviewHouse] = useState<PublicHouse | null>(null);
  const viewerHouse = previewHouse ?? defaultPreview;

  const filteredRows = useMemo(() => {
    if (filter === "collected") return eligible.filter((h) => gems.collected(h.id));
    if (filter === "missing") return eligible.filter((h) => !gems.collected(h.id));
    return eligible;
  }, [eligible, filter, gems.collectedIds]);

  return (
    <div className="gem-bag-page mx-auto w-full max-w-lg pb-12">
      <Link href="/" className="gem-bag-back mb-4 inline-flex items-center gap-1 text-sm text-violet-300 hover:text-orange-200">
        <ChevronLeft className="size-4" aria-hidden />
        חזרה למפה
      </Link>

      <header className={cn("gem-bag-hero", allDone && "gem-bag-hero--complete")}>
        <div className="gem-bag-hero__head">
          <Gem className="size-9 text-amber-300 drop-shadow-[0_0_12px_rgb(251_191_36/0.5)]" aria-hidden />
          <div className="min-w-0 flex-1 text-right">
            <h1 className="font-display text-2xl text-orange-200">תיק היהלומים</h1>
            <p className="mt-0.5 text-base text-violet-100">
              {collectedCount} מתוך {total} נאספו
            </p>
          </div>
          <div className="gem-bag-progress-ring" aria-hidden>
            <span className="gem-bag-progress-ring__value">{progressPct}%</span>
          </div>
        </div>
        <div className="gem-bag-progress-bar" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
          <div className="gem-bag-progress-bar__fill" style={{ width: `${progressPct}%` }} />
        </div>
        {allDone ? (
          <p className="gem-bag-hero__celebrate">
            <Sparkles className="inline size-4 text-amber-300" aria-hidden /> כל החבר&apos;ה איתכם — השכונה מלאה קסם!
          </p>
        ) : (
          <p className="gem-bag-hero__hint">לחצו על בית ברשימה כדי לראות את היהלום שלו. «מפה» מוביל לציד.</p>
        )}
      </header>

      <div className="gem-bag-viewer-wrap mt-4">
        <GemBagOrbitViewer house={viewerHouse} />
      </div>

      <div className="gem-bag-filters mt-5" role="tablist" aria-label="סינון אוסף">
        {(
          [
            ["all", "הכל", eligible.length],
            ["collected", "נאספו", collectedCount],
            ["missing", "ממתינים", Math.max(0, total - collectedCount)],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            className={cn("gem-bag-filter", filter === id && "is-active")}
            onClick={() => setFilter(id)}
          >
            {label}
            <span className="gem-bag-filter__count">{count}</span>
          </button>
        ))}
      </div>

      <section className="mt-4" aria-label="אוסף יהלומים">
        <ul className="gem-bag-list">
          {filteredRows.map((house) => {
            const collected = gems.collected(house.id);
            const monsterId = gemMonsterForHouse(house);
            const when = collectedAt.get(house.id);
            const isPreview = viewerHouse?.id === house.id;
            return (
              <li
                key={house.id}
                className={cn(
                  "gem-bag-row",
                  collected && "is-collected",
                  !collected && "is-missing",
                  isPreview && "is-preview",
                )}
              >
                <button
                  type="button"
                  className="gem-bag-row__select"
                  aria-pressed={isPreview}
                  onClick={() => setPreviewHouse(house)}
                >
                  <span className="gem-bag-row__thumb">
                    <GemSprite house={house} mode="poster" collected={collected} size="sm" />
                  </span>
                  <span className="gem-bag-row__body">
                    <span className="gem-bag-row__pet">{gemLabelHe(monsterId)}</span>
                    <span className="gem-bag-row__species">{gemSpeciesLabelHe(monsterId)}</span>
                    <span className="gem-bag-row__name">{houseHeadline(house)}</span>
                    <span className="gem-bag-row__addr">{formatDisplayAddress(house)}</span>
                    <span className="gem-bag-row__status">
                      {collected && when ? `נאסף · ${formatCollectedWhen(when)}` : "מחכה בציד"}
                    </span>
                  </span>
                </button>
                <div className="gem-bag-row__actions">
                  <Link href={`/?focus=${encodeURIComponent(house.id)}`} className="gem-bag-action">
                    <MapPinned className="size-4" aria-hidden />
                    מפה
                  </Link>
                  <Link href={houseSharePath(house)} className="gem-bag-action">
                    בית
                  </Link>
                  <a href={houseMapsUrl(house)} target="_blank" rel="noreferrer" className="gem-bag-action">
                    <Navigation className="size-4" aria-hidden />
                    ניווט
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
        {filteredRows.length === 0 ? (
          <p className="py-8 text-center text-base text-violet-300">אין פריטים בסינון הזה.</p>
        ) : null}
      </section>

      <section className="gem-bag-achievements mt-8">
        <h2 className="mb-3 text-lg font-semibold text-orange-200">הישגים</h2>
        <ul className="space-y-2">
          {GEM_ACHIEVEMENTS.map((achievement) => {
            const { count, target, done } = achievementProgress(
              achievement,
              gems.collectedIds,
              housesById,
              total,
            );
            return (
              <li key={achievement.id} className={cn("gem-bag-achievement", done && "is-done")}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-orange-50">{achievement.titleHe}</p>
                  <p className="text-sm text-violet-300">{achievement.descriptionHe}</p>
                </div>
                <span className="gem-bag-achievement__count tabular-nums">
                  {Math.min(count, target)} / {target}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {isAdmin ? (
        <details className="gem-bag-admin mt-8 rounded-xl border border-violet-500/25 bg-violet-950/20 p-3">
          <summary className="cursor-pointer text-sm font-medium text-violet-200">כלי מנהל — איפוס</summary>
          <div className="mt-3 space-y-2">
            {viewerHouse && gems.collected(viewerHouse.id) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-violet-400/40 text-violet-100"
                onClick={() => gems.resetHouse(viewerHouse.id)}
              >
                איפוס יהלום — {houseHeadline(viewerHouse)}
              </Button>
            ) : null}
            {collectedCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-red-400/35 text-red-100"
                onClick={() => {
                  if (
                    window.confirm(
                      "לאפס את כל היהלומים וההישגים במכשיר? כל ילד/ה יוכל/תוכל לאסוף מחדש.",
                    )
                  ) {
                    gems.resetAll();
                  }
                }}
              >
                איפוס מלא — תיק והישגים
              </Button>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export default function GemBagPage() {
  const { admin, ready } = useAdminSession();
  const { catalog, loading } = useCatalog();
  const visible = gemHuntVisible(admin);

  if (!ready) {
    return (
      <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden bg-[#12081a]">
        <AppHeader />
        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <p className="text-base text-violet-300">טוענים…</p>
        </main>
      </div>
    );
  }

  if (!visible) {
    return (
      <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden bg-[#12081a]">
        <AppHeader />
        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div className="mx-auto max-w-lg space-y-4">
            <h1 className="font-display text-2xl text-orange-300">תיק היהלומים</h1>
            <p className="text-base text-violet-200">הציד עדיין לא פתוח לכולם.</p>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              חזרה למפה
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const houses = catalog?.houses ?? [];

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden bg-[#12081a]">
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {loading && houses.length === 0 ? (
          <p className="text-base text-violet-300">טוענים נתונים…</p>
        ) : (
          <Suspense fallback={<p className="text-base text-violet-300">טוענים…</p>}>
            <GemBagContent houses={houses} isAdmin={admin} />
          </Suspense>
        )}
      </main>
    </div>
  );
}
