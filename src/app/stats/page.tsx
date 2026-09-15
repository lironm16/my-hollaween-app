"use client";

import { useEffect, useState } from "react";
import { AdminStatsCard, useSnapshotStats } from "@/components/admin-stats";
import { AppHeader } from "@/components/app-header";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useHouseSet } from "@/hooks/use-house-set";
import { useLikedHouses } from "@/hooks/use-liked-houses";
import { useVisitedHouses } from "@/hooks/use-visited-houses";
import type { ActivityTotals } from "@/lib/activity-sync";

function useActivityTotals() {
  const [totals, setTotals] = useState<ActivityTotals | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetch("/api/activity", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: ActivityTotals | null) => {
          if (!cancelled && data && typeof data.totalLiked === "number") setTotals(data);
        })
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, 20_000);
    const onRefresh = () => load();
    window.addEventListener("hw-activity-synced", onRefresh);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("hw-activity-synced", onRefresh);
    };
  }, []);

  return totals;
}

export default function StatsPage() {
  const { admin } = useAdminSession();
  const { houseSet } = useHouseSet();
  const stats = useSnapshotStats(true, admin ? houseSet : "real");
  const likes = useLikedHouses();
  const visits = useVisitedHouses();
  const activity = useActivityTotals();

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
              aggregateLiked={activity?.totalLiked}
              aggregateVisited={activity?.totalVisited}
            />
          ) : (
            <p className="text-base text-violet-300">טוענים נתונים…</p>
          )}
        </div>
      </main>
    </div>
  );
}
