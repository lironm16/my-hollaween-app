"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminDryRunPanel } from "@/components/admin-dry-run";
import { AdminStatsCard, useAdminStats } from "@/components/admin-stats";
import { AppHeader } from "@/components/app-header";
import { useAdminSession } from "@/hooks/use-admin-session";

export default function AdminRehearsalPage() {
  const router = useRouter();
  const { ready, admin } = useAdminSession();
  const stats = useAdminStats(admin);

  useEffect(() => {
    if (ready && !admin) router.replace("/admin");
  }, [ready, admin, router]);

  if (!ready || !admin) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-base text-orange-200">
        {ready ? "עוברים לכניסת מנהל…" : "בודקים הרשאות…"}
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto w-full max-w-lg space-y-4 pb-10">
          <h1 className="font-display text-2xl text-orange-300">בדיקות</h1>
          <AdminDryRunPanel />
          {stats ? <AdminStatsCard stats={stats} /> : null}
        </div>
      </main>
    </div>
  );
}
