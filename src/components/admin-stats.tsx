"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BellRing, HousePlus, MapPinned, Moon, Pause, Shield, Users } from "lucide-react";
import { CandySign } from "@/components/candy-glyphs";
import { OpenNowSign, ClosingSoonSign, OpeningSoonSign } from "@/components/open-now-mark";
import { ScareSign } from "@/components/scare-glyphs";
import { SensitivitySign } from "@/components/sensitivity-glyphs";
import { StrollerSign } from "@/components/symbols";
import { LikedSign } from "@/components/visit-marks";
import { VisitedCheck } from "@/components/visited-check";
import { PUSH_TOPIC_ROWS, type PushTopic } from "@/lib/push-topics";
import { scareShort, decorShort, treatLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { AdminSnapshot } from "@/lib/admin-snapshot";

export type AdminStats = AdminSnapshot;

const ALERT_ICONS: Record<PushTopic, ReactNode> = {
  newHouse: <HousePlus className="size-5" />,
  houseStatus: <BellRing className="size-5" />,
  admin: <Shield className="size-5" />,
};

function alertCount(stats: AdminStats, id: PushTopic) {
  if (id === "newHouse") return stats.devicesNewHouse;
  if (id === "houseStatus") return stats.devicesHouseStatus;
  return stats.devicesAdmin;
}

function useStats(url: string, enabled: boolean) {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = () => {
      void fetch(url, { cache: "no-store", credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: AdminStats | null) => {
          if (!cancelled && data && typeof data.houses === "number") setStats(data);
        })
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, url]);

  return stats;
}

export function useSnapshotStats(enabled = true) {
  return useStats("/api/stats", enabled);
}

export function useAdminStats(enabled: boolean) {
  return useStats("/api/admin/stats", enabled);
}

export function AlertStatsCard({ stats }: { stats: AdminStats }) {
  return (
    <Section title="התראות">
      <div className="grid grid-cols-1 gap-2">
        {PUSH_TOPIC_ROWS.map((row) => (
          <Tile
            key={row.id}
            icon={ALERT_ICONS[row.id]}
            label={row.title}
            value={alertCount(stats, row.id)}
            hint={row.hint}
            valueClass={alertCount(stats, row.id) ? "text-orange-200" : undefined}
          />
        ))}
      </div>
    </Section>
  );
}

export function AdminStatsCard({
  stats,
  likedCount,
  visitedCount,
}: {
  stats: AdminStats;
  likedCount?: number;
  visitedCount?: number;
}) {
  return (
    <div className="space-y-3" dir="rtl">
      <Section title="מפה">
        <div className="mb-2 grid grid-cols-2 gap-2">
          <Tile icon={<MapPinned className="size-5" />} label="בתים במפה" value={stats.houses} />
          <Tile
            icon={<Users className="size-5" />}
            label="משתמשים פעילים"
            value={stats.online}
            valueClass={stats.online ? "text-emerald-300" : undefined}
          />
        </div>
        <Subhead>שעות</Subhead>
        <Tile
          icon={<OpenNowSign className="size-8" />}
          label="פתוחים עכשיו"
          value={stats.openNow}
          valueClass="text-emerald-300"
          wide
          plain
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Tile
            icon={<OpeningSoonSign className="size-8" />}
            label="נפתחים בקרוב"
            value={stats.openingSoon}
            valueClass={stats.openingSoon ? "text-cyan-300" : undefined}
            plain
          />
          <Tile
            icon={<ClosingSoonSign className="size-8" />}
            label="נסגרים בקרוב"
            value={stats.closingSoon}
            valueClass={stats.closingSoon ? "text-orange-300" : undefined}
            plain
          />
          <Tile
            icon={<Pause className="size-4" />}
            label="בהפסקה"
            value={stats.onBreak}
            valueClass={stats.onBreak ? "text-amber-300" : undefined}
          />
          <Tile icon={<Moon className="size-4" />} label="סגורים" value={stats.closed} />
        </div>
        <Subhead>ממתקים</Subhead>
        <div className="grid grid-cols-2 gap-2">
          <Tile
            icon={<CandySign tone="none" className="size-8" />}
            label="בלי ממתקים"
            value={stats.candyNone}
            plain
          />
          <Tile
            icon={<CandySign tone="plenty" className="size-8" />}
            label="יש ממתקים"
            value={stats.candyPlenty}
            valueClass={stats.candyPlenty ? "text-emerald-300" : undefined}
            plain
          />
          <Tile
            icon={<CandySign tone="low" className="size-8" />}
            label="מעט ממתקים"
            value={stats.candyLow}
            valueClass={stats.candyLow ? "text-amber-300" : undefined}
            plain
          />
          <Tile
            icon={<CandySign tone="out" className="size-8" />}
            label="נגמרו הממתקים"
            value={stats.candyOut}
            valueClass={stats.candyOut ? "text-rose-300" : undefined}
            plain
          />
        </div>
        <Subhead>רגישויות</Subhead>
        <div className="grid grid-cols-2 gap-2">
          <Tile
            icon={<SensitivitySign kind="glutenFree" className="size-8" />}
            label={treatLabels.glutenFree}
            value={stats.glutenFree}
            plain
          />
          <Tile
            icon={<SensitivitySign kind="nutsFree" className="size-8" />}
            label={treatLabels.nutsFree}
            value={stats.nutsFree}
            plain
          />
          <Tile
            icon={<SensitivitySign kind="sesameFree" className="size-8" />}
            label={treatLabels.sesameFree}
            value={stats.sesameFree}
            plain
          />
        </div>
        <Subhead>במכשיר הזה</Subhead>
        <div className="grid grid-cols-2 gap-2">
          <Tile
            icon={<LikedSign className="size-8" />}
            label="שמורים"
            value={likedCount ?? 0}
            valueClass={likedCount ? "text-rose-300" : undefined}
            plain
          />
          <Tile
            icon={<VisitedCheck visited className="size-8" />}
            label="ביקרתי"
            value={visitedCount ?? 0}
            valueClass={visitedCount ? "text-emerald-300" : undefined}
            plain
          />
        </div>
        <Subhead>סימונים בשכונה</Subhead>
        <div className="grid grid-cols-2 gap-2">
          <Tile
            icon={<LikedSign className="size-8" />}
            label="שמורים"
            value={stats.hearts}
            valueClass={stats.hearts ? "text-rose-300" : undefined}
            plain
          />
          <Tile
            icon={<VisitedCheck visited className="size-8" />}
            label="ביקרתי"
            value={stats.visited}
            valueClass={stats.visited ? "text-emerald-300" : undefined}
            plain
          />
        </div>
        <Subhead>אופי</Subhead>
        <div className="grid grid-cols-2 gap-2">
          <Tile
            icon={<ScareSign level="none" className="size-8" />}
            label={decorShort.none}
            value={stats.notDecorated}
            plain
          />
          <Tile
            icon={<ScareSign level="mild" className="size-8" />}
            label={scareShort.mild}
            value={stats.scareMild}
            plain
          />
          <Tile
            icon={<ScareSign level="medium" className="size-8" />}
            label={scareShort.medium}
            value={stats.scareMedium}
            plain
          />
          <Tile
            icon={<ScareSign level="spicy" className="size-8" />}
            label={scareShort.spicy}
            value={stats.scareSpicy}
            plain
          />
          <Tile
            icon={<StrollerSign className="size-8" />}
            label="נגיש"
            value={stats.accessible}
            plain
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

function Subhead({ children }: { children: ReactNode }) {
  return <h3 className="mb-1.5 mt-3 text-sm font-semibold text-violet-200">{children}</h3>;
}

function Tile({
  icon,
  label,
  value,
  hint,
  valueClass,
  wide = false,
  plain = false,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  hint?: string;
  valueClass?: string;
  wide?: boolean;
  plain?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-xl bg-[#14081c] px-2.5 py-2",
        wide && "w-full",
      )}
    >
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-orange-300",
          plain ? "bg-transparent" : "bg-white/5",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 text-right">
        <span className="block text-sm leading-tight text-violet-300">{label}</span>
        {hint ? <span className="block text-xs leading-tight text-violet-400">{hint}</span> : null}
        <span className={cn("block text-2xl font-bold leading-none text-orange-50", valueClass)}>
          {value}
        </span>
      </span>
    </div>
  );
}
