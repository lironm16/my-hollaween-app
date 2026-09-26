"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AdminGemOpsPanel } from "@/components/admin-gem-ops-panel";
import { AppHeader } from "@/components/app-header";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useAppNow } from "@/hooks/use-app-clock";
import { useCatalog } from "@/hooks/use-catalog";
import { gemHuntFabVisible } from "@/lib/gem-hunt-enabled";
import type { PublicHouse } from "@/lib/types";

export default function AdminGemsPage() {
  const router = useRouter();
  const { ready, admin } = useAdminSession();
  const now = useAppNow();
  const eventNight = gemHuntFabVisible(admin, now);
  const { catalog, loading } = useCatalog();

  useEffect(() => {
    if (ready && !admin) router.replace("/admin");
  }, [ready, admin, router]);

  useEffect(() => {
    if (ready && admin && !eventNight) router.replace("/admin/rehearsal");
  }, [ready, admin, eventNight, router]);

  const houses = useMemo(() => {
    return (catalog?.houses ?? []) as PublicHouse[];
  }, [catalog?.houses]);

  if (!ready || !admin || !eventNight) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-base text-orange-200">
        {loading ? "טוען…" : "בודקים הרשאות…"}
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main className="relative z-10 flex min-h-0 flex-1 flex-col px-4 py-3">
        <div className="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col gap-2">
          <h1 className="shrink-0 font-display text-xl text-orange-300">יהלומים — מנהל</h1>
          <AdminGemOpsPanel houses={houses} />
        </div>
      </main>
    </div>
  );
}
