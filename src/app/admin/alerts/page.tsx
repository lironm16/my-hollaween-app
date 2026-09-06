"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminPushPanel } from "@/components/admin-push-panel";
import { AdminDryRunPanel } from "@/components/admin-dry-run";
import { AppHeader } from "@/components/app-header";
import { CsvExportButton } from "@/components/csv-export-button";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useHouseTraffic } from "@/hooks/use-house-traffic";
import { useOnlineDevices } from "@/hooks/use-presence";
import { toPublicHouse } from "@/lib/ids";
import type { House, PublicHouse } from "@/lib/types";

export default function AdminAlertsPage() {
  const router = useRouter();
  const { ready, admin } = useAdminSession();
  const { houses: traffic } = useHouseTraffic();
  const onlineDevices = useOnlineDevices(admin);
  const [houses, setHouses] = useState<PublicHouse[]>([]);

  useEffect(() => {
    if (ready && !admin) router.replace("/admin");
  }, [ready, admin, router]);

  useEffect(() => {
    if (!admin) return;
    let cancelled = false;
    void fetch("/api/admin/houses", { cache: "no-store", credentials: "include" })
      .then((res) => res.json())
      .then((data: { houses?: House[] }) => {
        if (cancelled) return;
        setHouses((data.houses ?? []).filter((house) => house.status !== "rejected").map(toPublicHouse));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [admin]);

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
          <h1 className="font-display text-2xl text-orange-300">התראות לשכונה</h1>
          <div className="rounded-xl bg-emerald-950/40 px-3 py-2 ring-1 ring-emerald-500/20">
            <p className="text-base font-medium text-emerald-100">
              {onlineDevices == null ? "בודקים כמה מכשירים פתוחים…" : `${onlineDevices} מכשירים באפליקציה עכשיו`}
            </p>
            <p className="mt-1 text-base text-emerald-50/90">
              טלפונים שהאפליקציה פתוחה אצלם בערך בשתי הדקות האחרונות. בלי מיקום ובלי שם. מתעדכן כל חצי
              דקה.
            </p>
          </div>
          <AdminDryRunPanel />
          <div className="space-y-2 rounded-xl bg-black/25 p-3">
            <p className="text-base font-medium text-amber-100">הורדה להדפסה</p>
            <p className="text-base text-violet-300">
              CSV עם שם, כתובת, שעות, ממתקים, פחד, קישוט, רגישויות, וכמה שמרו / ביקרו. נפתח
              באקסל או Google Sheets, ואז אפשר להדפיס. ברשימה הראשית יש כפתור דומה לרשימה המסוננת
              או לבתים ששמרתם בלב.
            </p>
            <CsvExportButton houses={houses} traffic={traffic} kind="all" label="כל הבתים (CSV)" />
          </div>
          <AdminPushPanel />
        </div>
      </main>
    </div>
  );
}
