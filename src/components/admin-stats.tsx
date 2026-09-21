"use client";

import { useMemo, type ReactNode } from "react";
import { MapPinned, Moon, Pause } from "lucide-react";
import { CandySign } from "@/components/candy-glyphs";
import { OpenNowSign, ClosingSoonSign, OpeningSoonSign } from "@/components/open-now-mark";
import { ScareSign } from "@/components/scare-glyphs";
import { SensitivitySign } from "@/components/sensitivity-glyphs";
import { StrollerSign } from "@/components/symbols";
import { LikedSign } from "@/components/visit-marks";
import { VisitedCheck } from "@/components/visited-check";
import { scareShort, decorShort, treatLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { buildSnapshotStats, type SnapshotStats } from "@/lib/admin-snapshot";
import { useCatalog } from "@/hooks/use-catalog";
import { useAppNow } from "@/hooks/use-app-clock";
import type { HouseSet } from "@/lib/house-set";

export type { SnapshotStats };

export function useSnapshotStats(enabled = true, houseSet: HouseSet = "real"): SnapshotStats | null {
  const { catalog } = useCatalog();
  const now = useAppNow();

  return useMemo(() => {
    if (!enabled || !catalog) return null;
    return buildSnapshotStats({ houses: catalog.houses, now, houseSet });
  }, [enabled, catalog, now, houseSet]);
}

export function AdminStatsCard({
  stats,
  likedCount,
  visitedCount,
}: {
  stats: SnapshotStats;
  likedCount?: number;
  visitedCount?: number;
}) {
  const personalMarks = (
    <div className="grid grid-cols-2 gap-2">
      <Tile
        icon={<LikedSign className="size-8" />}
        label="אהבתי"
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
  );

  return (
    <div className="space-y-3" dir="rtl">
      <Section title="סימונים שלי">{personalMarks}</Section>
      <Section title="מפה">
        <div className="mb-2">
          <Tile icon={<MapPinned className="size-5" />} label="בתים במפה" value={stats.houses} wide />
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
        <Subhead>נגישות</Subhead>
        <Tile
          icon={<StrollerSign className="size-8" />}
          label="נגיש"
          value={stats.accessible}
          plain
          wide
        />
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
  return <h3 className="mb-1.5 mt-3 text-base font-semibold text-violet-200">{children}</h3>;
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
        <span className="block text-base leading-tight text-violet-300">{label}</span>
        {hint ? <span className="block text-sm leading-tight text-violet-400">{hint}</span> : null}
        <span className={cn("block text-2xl font-bold leading-none text-orange-50", valueClass)}>
          {value}
        </span>
      </span>
    </div>
  );
}
