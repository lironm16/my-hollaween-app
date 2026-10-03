"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminGemLabPanel } from "@/components/admin-gem-lab-panel";
import { AppHeader } from "@/components/app-header";
import { useAdminSession } from "@/hooks/use-admin-session";

/** Hidden admin URL — pin gem test stubs at your GPS / map tap. */
export default function AdminGemLabPage() {
  const router = useRouter();
  const { ready, admin } = useAdminSession();

  useEffect(() => {
    if (ready && !admin) router.replace("/admin");
  }, [ready, admin, router]);

  if (!ready || !admin) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-base text-orange-200">
        בודקים הרשאות…
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main className="relative z-10 flex min-h-0 flex-1 flex-col px-4 py-3">
        <div className="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col gap-2">
          <div className="flex shrink-0 items-start justify-between gap-2">
            <div>
              <h1 className="font-display text-xl text-violet-200">מעבדת יהלומים</h1>
              <p className="text-xs text-violet-400">/admin/gem-lab</p>
            </div>
            <Link
              href="/admin/rehearsal"
              className="shrink-0 text-sm text-orange-200 underline-offset-2 hover:underline"
            >
              ← הגדרות מנהל
            </Link>
          </div>
          <AdminGemLabPanel />
        </div>
      </main>
    </div>
  );
}
