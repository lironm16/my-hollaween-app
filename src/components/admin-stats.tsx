"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BellRing, Clock3, MapPinned, Moon, Pause, Smartphone, Users } from "lucide-react";
import { CandyTwist } from "@/components/candy-glyphs";
import { cn } from "@/lib/utils";

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
    <div className="space-y-3" dir="rtl">
      <p className="text-base text-violet-300">
        כל טלפון שנכנס נספר, גם בלי התראות. מבקרים = האפליקציה פתוחה עכשיו.
      </p>

      <Section title="מכשירים">
        <div className="grid grid-cols-3 gap-2">
          <Tile icon={<Smartphone className="size-5" />} label="נכנסו" value={stats.devicesSeen ?? 0} />
          <Tile
            icon={<Users className="size-5" />}
            label="מבקרים"
            value={stats.online ?? 0}
            valueClass={stats.online ? "text-emerald-300" : undefined}
          />
          <Tile
            icon={<BellRing className="size-5" />}
            label="התראות"
            value={stats.devices}
            valueClass={stats.devices ? "text-orange-200" : undefined}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip label="בית חדש" value={stats.devicesNewHouse} />
          <Chip label="מצב בית" value={stats.devicesHouseStatus} />
          <Chip label="מנהלים" value={stats.devicesAdmin} />
        </div>
      </Section>

      <Section title="מפה">
        <Tile
          icon={<MapPinned className="size-5" />}
          label="בתים במפה"
          value={stats.houses}
          wide
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Tile
            icon={<span className="size-2.5 rounded-full bg-emerald-400" />}
            label="פתוחים עכשיו"
            value={stats.openNow}
            valueClass="text-emerald-300"
          />
          <Tile
            icon={<Pause className="size-4" />}
            label="בהפסקה"
            value={stats.onBreak}
            valueClass={stats.onBreak ? "text-amber-300" : undefined}
          />
          <Tile icon={<Moon className="size-4" />} label="סגורים" value={stats.closed} />
          <Tile
            icon={<Clock3 className="size-4" />}
            label="ממתינים לאישור"
            value={stats.pending}
            valueClass={stats.pending ? "text-cyan-300" : undefined}
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Tile
            icon={
              <span className="size-5 text-amber-300">
                <CandyTwist />
              </span>
            }
            label="מעט ממתקים"
            value={stats.candyLow}
            valueClass={stats.candyLow ? "text-amber-300" : undefined}
          />
          <Tile
            icon={
              <span className="relative size-5 text-rose-300">
                <CandyTwist />
                <span className="absolute inset-x-0 top-1/2 h-0.5 -rotate-12 bg-rose-400" />
              </span>
            }
            label="נגמרו הממתקים"
            value={stats.candyOut}
            valueClass={stats.candyOut ? "text-rose-300" : undefined}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-[#241332] p-2.5 ring-1 ring-white/10">
      <h2 className="mb-2 text-base font-semibold text-orange-400">{title}</h2>
      {children}
    </section>
  );
}

function Tile({
  icon,
  label,
  value,
  valueClass,
  wide = false,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  valueClass?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-xl bg-[#14081c] px-2.5 py-2",
        wide && "w-full",
      )}
    >
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-orange-300">
        {icon}
      </span>
      <span className="min-w-0 text-right">
        <span className="block text-sm leading-tight text-violet-300">{label}</span>
        <span className={cn("block text-2xl font-bold leading-none text-orange-50", valueClass)}>
          {value}
        </span>
      </span>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#14081c] px-2.5 py-1 text-sm text-violet-200">
      {label}
      <span className="font-semibold text-orange-100">{value}</span>
    </span>
  );
}
