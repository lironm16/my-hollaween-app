"use client";

import { useMemo, type ReactNode } from "react";
import { Gem, Home, MapPinned, Moon, Pause } from "lucide-react";
import { LocationKindSign } from "@/components/location-kind-sign";
import { CandySign } from "@/components/candy-glyphs";
import { OpenNowSign, ClosingSoonSign, OpeningSoonSign } from "@/components/open-now-mark";
import { ScareSign } from "@/components/scare-glyphs";
import { SensitivitySign } from "@/components/sensitivity-glyphs";
import { StrollerSign } from "@/components/symbols";
import { LikedSign, SkipSign } from "@/components/visit-marks";
import { VisitedCheck } from "@/components/visited-check";
import { scareShort, decorShort, treatLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { buildSnapshotStats, type SnapshotStats } from "@/lib/admin-snapshot";
import { resolveCatalogHouses } from "@/lib/catalog-houses";
import { useCatalog } from "@/hooks/use-catalog";
import { useAppNow } from "@/hooks/use-app-clock";
import type { HouseSet } from "@/lib/house-set";
import { SENSITIVITY_OPTIONS } from "@/lib/types";

export type { SnapshotStats };

export type PersonalMarksTab = "mine" | "saved" | "visited" | "skipped" | "collected";

export function PersonalMarksSection({
  ownedCount,
  likedCount,
  visitedCount,
  skippedCount,
  gemCollectedCount,
  showGemStats = false,
  selectedTab,
  onSelectTab,
}: {
  ownedCount: number;
  likedCount: number;
  visitedCount: number;
  skippedCount: number;
  gemCollectedCount: number;
  showGemStats?: boolean;
  selectedTab: PersonalMarksTab;
  onSelectTab: (tab: PersonalMarksTab) => void;
}) {
  return (
    <section className="rounded-2xl bg-[#241332] p-2.5 ring-1 ring-white/10" dir="rtl">
      <div className="grid grid-cols-2 gap-2">
        <StatTile
          icon={<Home className="size-8 text-orange-300" strokeWidth={2.1} />}
          label="בתים שלי"
          value={ownedCount}
          valueClass={ownedCount ? "text-orange-200" : undefined}
          plain
          selected={selectedTab === "mine"}
          onClick={() => onSelectTab("mine")}
        />
        <StatTile
          icon={<LikedSign className="size-8" />}
          label="אהבתי"
          value={likedCount}
          valueClass={likedCount ? "text-rose-300" : undefined}
          plain
          selected={selectedTab === "saved"}
          onClick={() => onSelectTab("saved")}
        />
        <StatTile
          icon={<VisitedCheck visited className="size-8" />}
          label="ביקרתי"
          value={visitedCount}
          valueClass={visitedCount ? "text-emerald-300" : undefined}
          plain
          selected={selectedTab === "visited"}
          onClick={() => onSelectTab("visited")}
        />
        <StatTile
          icon={<SkipSign className="size-8" />}
          label="דילגתי"
          value={skippedCount}
          valueClass={skippedCount ? "text-slate-300" : undefined}
          plain
          selected={selectedTab === "skipped"}
          onClick={() => onSelectTab("skipped")}
        />
        {showGemStats ? (
          <StatTile
            icon={<Gem className="size-8 fill-amber-300 text-amber-300" strokeWidth={2.1} />}
            label="אספתי"
            value={gemCollectedCount}
            valueClass={gemCollectedCount ? "text-amber-300" : undefined}
            plain
            wide
            selected={selectedTab === "collected"}
            onClick={() => onSelectTab("collected")}
          />
        ) : null}
      </div>
    </section>
  );
}

export function useSnapshotStats(enabled = true, houseSet: HouseSet = "real"): SnapshotStats | null {
  const { catalog } = useCatalog();
  const now = useAppNow();

  const houses = useMemo(() => resolveCatalogHouses(catalog), [catalog]);

  return useMemo(() => {
    if (!enabled || !catalog) return null;
    return buildSnapshotStats({ houses, now, houseSet });
  }, [enabled, catalog, houses, now, houseSet]);
}

export function AdminStatsCard({
  stats,
}: {
  stats: SnapshotStats;
}) {
  return (
    <div className="space-y-3" dir="rtl">
      <Section title="מפה">
        <div className="mb-2 grid grid-cols-2 gap-2">
          <StatTile icon={<MapPinned className="size-5" />} label="בתים במפה" value={stats.houses} />
          <StatTile
            icon={<LocationKindSign kind="poi" className="size-8" />}
            label="נקודות עניין"
            value={stats.pois}
            plain
          />
        </div>
        <Subhead>שעות</Subhead>
        <StatTile
          icon={<OpenNowSign className="size-8" />}
          label="פתוחים עכשיו"
          value={stats.openNow}
          valueClass="text-emerald-300"
          wide
          plain
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <StatTile
            icon={<OpeningSoonSign className="size-8" />}
            label="נפתחים בקרוב"
            value={stats.openingSoon}
            valueClass={stats.openingSoon ? "text-cyan-300" : undefined}
            plain
          />
          <StatTile
            icon={<ClosingSoonSign className="size-8" />}
            label="נסגרים בקרוב"
            value={stats.closingSoon}
            valueClass={stats.closingSoon ? "text-orange-300" : undefined}
            plain
          />
          <StatTile
            icon={<Pause className="size-4" />}
            label="בהפסקה"
            value={stats.onBreak}
            valueClass={stats.onBreak ? "text-amber-300" : undefined}
          />
          <StatTile icon={<Moon className="size-4" />} label="סגורים" value={stats.closed} />
        </div>
        <Subhead>נגישות</Subhead>
        <StatTile
          icon={<StrollerSign className="size-8" />}
          label="נגיש"
          value={stats.accessible}
          plain
          wide
        />
        <Subhead>ממתקים</Subhead>
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            icon={<CandySign tone="none" className="size-8" />}
            label="בלי ממתקים"
            value={stats.candyNone}
            plain
          />
          <StatTile
            icon={<CandySign tone="plenty" className="size-8" />}
            label="יש ממתקים"
            value={stats.candyPlenty}
            valueClass={stats.candyPlenty ? "text-emerald-300" : undefined}
            plain
          />
          <StatTile
            icon={<CandySign tone="low" className="size-8" />}
            label="מעט ממתקים"
            value={stats.candyLow}
            valueClass={stats.candyLow ? "text-amber-300" : undefined}
            plain
          />
          <StatTile
            icon={<CandySign tone="out" className="size-8" />}
            label="נגמרו הממתקים"
            value={stats.candyOut}
            valueClass={stats.candyOut ? "text-rose-300" : undefined}
            plain
          />
        </div>
        <Subhead>רגישויות והתאמות</Subhead>
        <div className="grid grid-cols-2 gap-2">
          {SENSITIVITY_OPTIONS.map((id) => (
            <StatTile
              key={id}
              icon={<SensitivitySign kind={id} className="size-8" />}
              label={treatLabels[id]}
              value={stats[id]}
              plain
            />
          ))}
        </div>
        <Subhead>אופי</Subhead>
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            icon={<ScareSign level="none" className="size-8" />}
            label={decorShort.none}
            value={stats.notDecorated}
            plain
          />
          <StatTile
            icon={<ScareSign level="mild" className="size-8" />}
            label={scareShort.mild}
            value={stats.scareMild}
            plain
          />
          <StatTile
            icon={<ScareSign level="medium" className="size-8" />}
            label={scareShort.medium}
            value={stats.scareMedium}
            plain
          />
          <StatTile
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

function StatTile({
  icon,
  label,
  value,
  hint,
  valueClass,
  wide = false,
  plain = false,
  selected = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  hint?: string;
  valueClass?: string;
  wide?: boolean;
  plain?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    "flex min-w-0 items-center gap-2.5 rounded-xl bg-[#14081c] px-2.5 py-2 text-start",
    wide && "col-span-2 w-full",
    onClick &&
      "cursor-pointer transition hover:bg-[#1a1028] hover:ring-1 hover:ring-orange-500/25 active:scale-[0.99]",
    selected && "ring-2 ring-orange-400/50 bg-[#1a1028]",
  );
  const body = (
    <>
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
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick} aria-pressed={selected}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}
