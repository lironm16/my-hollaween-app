"use client";

import { useEffect, useState } from "react";

export type AdminStats = {
  devices: number;
  devicesSeen?: number;
  online?: number;
  devicesNewHouse: number;
  devicesHouseStatus: number;
  devicesAdmin: number;
  houses: number;
  pending: number;
  openNow: number;
  onBreak: number;
  closed: number;
  candyLow: number;
  candyOut: number;
};

export function useAdminStats(enabled: boolean) {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStats(null);
      return;
    }
    let cancelled = false;
    const load = () => {
      void fetch("/api/admin/stats", { cache: "no-store", credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: AdminStats | null) => {
          if (!cancelled && data && typeof data.devices === "number") setStats(data);
        })
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled]);

  return stats;
}

export function AdminStatsCard({ stats }: { stats: AdminStats }) {
  return (
    <div className="space-y-2 rounded-xl bg-black/25 p-3">
      <p className="text-base font-medium text-amber-100">מכשירים ומפה</p>
      <p className="text-base text-violet-300">
        כל טלפון שנכנס לאפליקציה נספר, גם בלי התראות. מבקרים = האפליקציה פתוחה עכשיו. התראות = מי
        שאישר קבלת הודעות.
      </p>
      <dl className="grid grid-cols-2 gap-2 text-base">
        <Stat label="מכשירים שנכנסו" value={stats.devicesSeen ?? 0} />
        <Stat label="מבקרים עכשיו" value={stats.online ?? 0} />
        <Stat label="מכשירים עם התראות" value={stats.devices} />
        <Stat label="בתים במפה" value={stats.houses} />
        <Stat label="פתוחים עכשיו" value={stats.openNow} />
        <Stat label="בהפסקה" value={stats.onBreak} />
        <Stat label="סגורים" value={stats.closed} />
        <Stat label="מעט ממתקים" value={stats.candyLow} />
        <Stat label="נגמרו הממתקים" value={stats.candyOut} />
        <Stat label="ממתינים לאישור" value={stats.pending} />
      </dl>
      <p className="text-base text-violet-400">
        נושאים: בית חדש {stats.devicesNewHouse} · מצב בית {stats.devicesHouseStatus} · מנהלים{" "}
        {stats.devicesAdmin}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[#12081a]/80 px-2 py-1.5 ring-1 ring-orange-500/15">
      <dt className="text-violet-300">{label}</dt>
      <dd className="font-medium text-orange-100">{value}</dd>
    </div>
  );
}
