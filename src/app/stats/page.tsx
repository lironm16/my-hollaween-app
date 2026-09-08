"use client";

import { AdminStatsCard, useSnapshotStats } from "@/components/admin-stats";
import { AppHeader } from "@/components/app-header";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useVisitedHouses } from "@/hooks/use-visited-houses";

export default function StatsPage() {
  const stats = useSnapshotStats(true);
  const likes = useLikedHouses();
  const visits = useVisitedHouses();

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto w-full max-w-lg space-y-4 pb-10">
          <h1 className="font-display text-2xl text-orange-300">תמונת מצב</h1>
          {stats ? (
            <AdminStatsCard
              stats={stats}
              likedCount={likes.likedIds.length}
              visitedCount={visits.visitedIds.length}
            />
          ) : (
            <p className="text-base text-violet-300">טוענים נתונים…</p>
          )}
        </div>
      </main>
    </div>
  );
}
