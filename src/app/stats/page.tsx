"use client";

import { useEffect } from "react";
import { AdminStatsCard, useSnapshotStats } from "@/components/admin-stats";
import { AppHeader } from "@/components/app-header";
import { useCatalog } from "@/hooks/use-catalog";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useHouseSet } from "@/hooks/use-house-set";
import { activeHouseSetForSession } from "@/lib/house-set";
import { useLocale } from "@/hooks/use-locale";

export default function StatsPage() {
  const { t, dir } = useLocale();
  const { catalog, refresh } = useCatalog();
  const { admin } = useAdminSession();
  const { houseSet } = useHouseSet();
  const activeHouseSet = activeHouseSetForSession(admin, houseSet, catalog);
  const stats = useSnapshotStats(true, activeHouseSet);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto w-full max-w-lg space-y-4 pb-10" dir={dir}>
          <h1 className="font-display text-2xl text-orange-300">{t("stats.title")}</h1>
          {stats ? (
            <AdminStatsCard stats={stats} />
          ) : (
            <p className="text-base text-violet-300">{t("stats.loading")}</p>
          )}
        </div>
      </main>
    </div>
  );
}
