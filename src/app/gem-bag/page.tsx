"use client";

import Link from "next/link";
import { Gem, MapPinned, Navigation } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { GemSprite } from "@/components/gem-hunt/gem-sprite";
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
} from "@/lib/gem-hunt";
import { houseHeadline } from "@/lib/labels";
import { houseMapsUrl, houseSharePath } from "@/lib/nav-links";
import type { PublicHouse } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
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

function GemBagContent({ houses }: { houses: PublicHouse[] }) {
  const gems = useGemProgress();
  const eligible = [...houses].sort((a, b) => {
    const aCollected = gems.collected(a.id);
    const bCollected = gems.collected(b.id);
    if (aCollected !== bCollected) return aCollected ? -1 : 1;
    return formatDisplayAddress(a).localeCompare(formatDisplayAddress(b), "he");
  });
  const total = countGemEligibleHouses(eligible);
  const housesById = new Map(eligible.map((h) => [h.id, h]));
  const collectedAt = new Map(gems.entries.map((e) => [e.houseId, e.collectedAt]));

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 pb-10">
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
                className={cn("gem-bag-row", collected && "is-collected", !collected && "is-missing")}
              >
                <GemSprite house={house} mode="poster" collected={collected} size="sm" />
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
          <GemBagContent houses={houses} />
        )}
      </main>
    </div>
  );
}
