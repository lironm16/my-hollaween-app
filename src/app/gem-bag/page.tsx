"use client";

import Link from "next/link";
import { Gem } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { GemSprite } from "@/components/gem-hunt/gem-sprite";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useGemProgress } from "@/hooks/use-gem-progress";
import { gemHuntVisible } from "@/lib/gem-hunt-enabled";
import {
  achievementProgress,
  countGemEligibleHouses,
  GEM_ACHIEVEMENTS,
  gemLabelHe,
  gemTypeForHouse,
} from "@/lib/gem-hunt";
import type { PublicHouse } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function GemBagContent({ houses }: { houses: PublicHouse[] }) {
  const gems = useGemProgress();
  const eligible = houses.filter((h) => h.kind !== "poi");
  const total = countGemEligibleHouses(eligible);
  const housesById = new Map(eligible.map((h) => [h.id, h]));
  const collectedSet = new Set(gems.collectedIds);

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 pb-10">
      <div className="gem-bag-summary">
        <Gem className="size-8 text-amber-300" aria-hidden />
        <div>
          <h1 className="font-display text-2xl text-orange-300">תיק האוצרות</h1>
          <p className="text-base text-violet-200">
            {gems.collectedIds.length} / {total} אוצרות במפה
          </p>
        </div>
      </div>

      <section className="gem-bag-grid" aria-label="אוסף אוצרות">
        {eligible.map((house) => {
          const collected = collectedSet.has(house.id);
          const type = gemTypeForHouse(house);
          return (
            <div
              key={house.id}
              className={cn("gem-bag-slot", collected && "is-collected")}
              title={house.name || house.address}
            >
              <GemSprite type={type} collected={collected} size="sm" />
              <span className="gem-bag-slot__label">{gemLabelHe(type)}</span>
            </div>
          );
        })}
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
