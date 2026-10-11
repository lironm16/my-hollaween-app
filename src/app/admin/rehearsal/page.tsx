"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminDryRunPanel } from "@/components/admin-dry-run";
import { AppHeader } from "@/components/app-header";
import { useAdminSession } from "@/hooks/use-admin-session";

export default function AdminRehearsalPage() {
  const router = useRouter();
  const { ready, admin } = useAdminSession();

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
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-1 py-1 sm:px-2">
        <div className="mx-auto w-full max-w-lg space-y-2 px-2 pb-4 pt-1">
          <h1 className="font-display text-xl text-orange-300">הגדרות מנהל</h1>
          <p className="text-sm text-violet-400">הרחיבו קטע כדי לערוך · הכל נשאר זמין</p>
          <AdminDryRunPanel />
        </div>
      </main>
    </div>
  );
}
