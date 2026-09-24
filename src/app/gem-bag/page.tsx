"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, Gem, MapPinned, Navigation } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { GemCollectCheer } from "@/components/gem-collect-cheer";
import { GemBagOrbitViewer } from "@/components/gem-hunt/gem-bag-orbit-viewer";
import { GemHuntOverlay } from "@/components/gem-hunt/gem-hunt-overlay";
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
  GEM_COLLECT_ANIMATION_MS,
} from "@/lib/gem-hunt";
import { houseHeadline } from "@/lib/labels";
import { houseMapsUrl, houseSharePath } from "@/lib/nav-links";
import type { PublicHouse } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { prepareGemHuntSensors } from "@/lib/gem-hunt-sensors";
import { cn } from "@/lib/utils";

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
  const eligible = [...houses].sort((a, b) => {
    const aCollected = gems.collected(a.id);
    const bCollected = gems.collected(b.id);
    if (aCollected !== bCollected) return aCollected ? -1 : 1;
    return formatDisplayAddress(a).localeCompare(formatDisplayAddress(b), "he");
  });
  const total = countGemEligibleHouses(eligible);
  const housesById = new Map(eligible.map((h) => [h.id, h]));
  const collectedAt = new Map(gems.entries.map((e) => [e.houseId, e.collectedAt]));

  const defaultPreview = useMemo(() => {
    if (focusId) {
      const focused = eligible.find((h) => h.id === focusId);
      if (focused) return focused;
    }
    const collectedHouse = eligible.find((h) => gems.collected(h.id));
    return collectedHouse ?? eligible[0] ?? null;
  }, [eligible, focusId, gems.collectedIds]);

  const [previewHouse, setPreviewHouse] = useState<PublicHouse | null>(null);
  const [cameraLabHouse, setCameraLabHouse] = useState<PublicHouse | null>(null);
  const [cheerHouse, setCheerHouse] = useState<PublicHouse | null>(null);
  const viewerHouse = previewHouse ?? defaultPreview;

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 pb-10">
      <GemBagOrbitViewer house={viewerHouse} />

      {isAdmin && viewerHouse ? (
        <Button
          type="button"
          variant="outline"
          className="w-full border-amber-400/40 text-amber-100"
          onClick={() => {
            void prepareGemHuntSensors().then(() => setCameraLabHouse(viewerHouse));
          }}
        >
          <Camera className="size-4" aria-hidden />
          ניסיון מצלמה (מכל מקום)
        </Button>
      ) : null}

      {cheerHouse ? <GemCollectCheer show house={cheerHouse} /> : null}

      {cameraLabHouse ? (
        <GemHuntOverlay
          house={cameraLabHouse}
          userLocation={null}
          labMode
          onClose={() => setCameraLabHouse(null)}
          onCollect={(monsterId) => {
            const h = cameraLabHouse;
            gems.collect(h.id, monsterId);
            setCameraLabHouse(null);
            setCheerHouse(h);
            window.setTimeout(() => setCheerHouse(null), GEM_COLLECT_ANIMATION_MS + 400);
          }}
        />
      ) : null}

      <div className="gem-bag-summary">
        <Gem className="size-8 text-amber-300" aria-hidden />
        <div>
          <h1 className="font-display text-2xl text-orange-300">תיק האוצרות</h1>
          <p className="text-base text-violet-200">
            {gems.collectedIds.length} / {total} אוצרות במפה
          </p>
          <p className="mt-1 text-sm text-violet-400">
            כל אוצר מסתתר ליד בית או נקודה על המפה — לחצו «מפה» כדי לצוד.
          </p>
          {isAdmin ? (
            <div className="gem-bag-reset mt-3 space-y-2">
              {viewerHouse && gems.collected(viewerHouse.id) ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-violet-400/40 text-violet-100"
                  onClick={() => gems.resetHouse(viewerHouse.id)}
                >
                  איפוס אוצר ליד {houseHeadline(viewerHouse)} — חיפוש מחדש
                </Button>
              ) : null}
              {gems.collectedIds.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-red-400/35 text-red-100"
                  onClick={() => {
                    if (
                      window.confirm(
                        "לאפס את כל האוצרות וההישגים במכשיר? כל ילד/ה יוכל/תוכל לאסוף מחדש.",
                      )
                    ) {
                      gems.resetAll();
                    }
                  }}
                >
                  איפוס מלא — תיק והישגים (ילד/ה הבא)
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <section aria-label="אוסף אוצרות">
        <ul className="gem-bag-list">
          {eligible.map((house) => {
            const collected = gems.collected(house.id);
            const monsterId = gemMonsterForHouse(house);
            const when = collectedAt.get(house.id);
            return (
              <li
                key={house.id}
                className={cn(
                  "gem-bag-row",
                  collected && "is-collected",
                  !collected && "is-missing",
                  viewerHouse?.id === house.id && "is-preview",
                )}
              >
                <button
                  type="button"
                  className="gem-bag-row__thumb"
                  aria-label={`תצוגה תלת־ממדית — ${houseHeadline(house)}`}
                  onClick={() => setPreviewHouse(house)}
                >
                  <GemSprite house={house} mode="poster" collected={collected} size="sm" />
                </button>
                <div className="gem-bag-row__body">
                  <p className="gem-bag-row__name">{houseHeadline(house)}</p>
                  <p className="gem-bag-row__addr">{formatDisplayAddress(house)}</p>
                  <p className="gem-bag-row__treasure">
                    {gemLabelHe(monsterId)}
                    {collected && when ? ` · נאסף ${formatCollectedWhen(when)}` : " · מחכה בציד"}
                  </p>
                  <div className="gem-bag-row__links">
                    <Link
                      href={`/?focus=${encodeURIComponent(house.id)}`}
                      className="gem-bag-row__link"
                    >
                      <MapPinned className="size-3.5" aria-hidden />
                      מפה
                    </Link>
                    <Link href={houseSharePath(house)} className="gem-bag-row__link">
                      פרטי הבית
                    </Link>
                    <a
                      href={houseMapsUrl(house)}
                      target="_blank"
                      rel="noreferrer"
                      className="gem-bag-row__link"
                    >
                      <Navigation className="size-3.5" aria-hidden />
                      ניווט
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="gem-bag-achievements">
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
              <li
                key={achievement.id}
                className={cn("gem-bag-achievement", done && "is-done")}
              >
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
    </div>
  );
}

export default function GemBagPage() {
  const { admin, ready } = useAdminSession();
  const { catalog, loading } = useCatalog();
  const visible = gemHuntVisible(admin);

  if (!ready) {
    return (
      <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
        <AppHeader />
        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <p className="text-base text-violet-300">טוענים…</p>
        </main>
      </div>
    );
  }

  if (!visible) {
    return (
      <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
        <AppHeader />
        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div className="mx-auto max-w-lg space-y-4">
            <h1 className="font-display text-2xl text-orange-300">תיק האוצרות</h1>
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
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
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
