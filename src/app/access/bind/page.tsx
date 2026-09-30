"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { bindDeviceInvite, roleBadgeLabel } from "@/lib/access-client";
import { useCatalog } from "@/hooks/use-catalog";
import type { DeviceRole } from "@/lib/types";

function BindContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useCatalog();
  const token = params.get("token")?.trim() ?? "";
  const houseId = params.get("house")?.trim() ?? "";
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ role: DeviceRole } | null>(null);

  async function confirm() {
    if (!token || !houseId) {
      toast.error("קישור לא תקין.");
      return;
    }
    setBusy(true);
    try {
      const result = await bindDeviceInvite(token, houseId);
      toast.success(`נרשמתם כ${roleBadgeLabel(result.role)}`);
      setDone({ role: result.role });
      await refresh(true);
      router.replace("/my");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "לא הצלחנו לרשום");
    } finally {
      setBusy(false);
    }
  }

  if (!token || !houseId) {
    return (
      <p className="text-violet-200">קישור ההזמנה לא תקין.</p>
    );
  }

  if (done) {
    return (
      <p className="text-orange-100">
        {roleBadgeLabel(done.role)} — מעבירים ל«במכשיר שלי»…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-violet-100">עורך הבית הזמין את המכשיר הזה. לחצו לאישור.</p>
      <Button
        type="button"
        className="w-full bg-orange-500 text-black hover:bg-orange-400"
        disabled={busy}
        onClick={() => void confirm()}
      >
        אשר רישום
      </Button>
      <Link href="/" className="block text-center text-sm text-violet-300 underline">
        חזרה למפה
      </Link>
    </div>
  );
}

export default function AccessBindPage() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-8">
        <h1 className="font-display text-2xl text-orange-300">רישום מכשיר</h1>
        <div className="mt-6 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/25" dir="rtl">
          <Suspense fallback={<p className="text-violet-200">טוענים…</p>}>
            <BindContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
