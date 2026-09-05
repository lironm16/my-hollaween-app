"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminPushPanel } from "@/components/admin-push-panel";
import { AppHeader } from "@/components/app-header";
import { useAdminSession } from "@/hooks/use-admin-session";

export default function AdminAlertsPage() {
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
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto w-full max-w-lg pb-10">
          <h1 className="font-display text-2xl text-orange-300">התראות לשכונה</h1>
          <div className="mt-4">
            <AdminPushPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
