"use client";

import { ReactNode } from "react";
import {
  Accessibility,
  Candy,
  Check,
  Map as MapIcon,
  List as ListIcon,
  Activity,
  Gauge,
  Ghost,
  RefreshCw,
} from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useMapUIStore, ViewMode } from "@/stores/map-ui-store";
import { cn } from "@/lib/utils";

const scareLevelLabels: Record<string, string> = {
  low: "רגוע",
  medium: "בינוני",
  high: "מפחיד",
};

const candyLabels: Record<string, string> = {
  green: "מלא",
  yellow: "מתמעט",
  red: "נגמר",
};

const accessibilityLabels: Record<string, string> = {
  wheelchair: "נגיש לכסא גלגלים",
  stroller: "ידידותי לעגלות",
  visual: "סיוע ראייה",
  hearing: "סיוע שמיעה",
  "low-sensory": "שקט לחושים",
};

const dietaryLabels: Record<string, string> = {
  "gluten-free": "ללא גלוטן",
  "nut-free": "ללא אגוזים",
  vegan: "טבעוני",
  kosher: "כשר",
  "sugar-free": "ללא סוכר",
};

const candyIndicatorClasses: Record<string, string> = {
  green: "bg-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.55)]",
  yellow: "bg-amber-300/80 shadow-[0_0_12px_rgba(250,204,21,0.55)]",
  red: "bg-rose-400/80 shadow-[0_0_12px_rgba(244,114,182,0.55)]",
};

const viewModes: { value: ViewMode; label: string; icon: typeof MapIcon }[] = [
  { value: "map", label: "מפה", icon: MapIcon },
  { value: "list", label: "רשימה", icon: ListIcon },
];

export function FilterToolbar() {
  const {
    viewMode,
    setViewMode,
    filters,
    toggleScareLevel,
    toggleCandyLevel,
    toggleAccessibility,
    toggleDietary,
    toggleOpenNow,
    toggleFavorites,
    setRadius,
    resetFilters,
  } = useMapUIStore(
    useShallow((state) => ({
      viewMode: state.viewMode,
      setViewMode: state.setViewMode,
      filters: state.filters,
      toggleScareLevel: state.toggleScareLevel,
      toggleCandyLevel: state.toggleCandyLevel,
      toggleAccessibility: state.toggleAccessibility,
      toggleDietary: state.toggleDietary,
      toggleOpenNow: state.toggleOpenNow,
      toggleFavorites: state.toggleFavorites,
      setRadius: state.setRadius,
      resetFilters: state.resetFilters,
    })),
  );

  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-[var(--color-card-border)] bg-[var(--color-card)]/80 p-5 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-300/80">מצאו את המסלול המושלם</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
            בתים משתתפים - ליל כל הקדושים
          </h1>
        </div>
        <nav className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1">
          {viewModes.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              type="button"
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-all",
                viewMode === value
                  ? "bg-gradient-to-l from-[var(--color-accent)] to-[var(--color-accent-strong)] text-black shadow-lg"
                  : "text-slate-200/80 hover:bg-white/10",
              )}
              onClick={() => setViewMode(value)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <CardGroup
          title="תעדוף סוכריות"
          icon={<Candy className="h-4 w-4 text-pink-300" />}
          description="ראו באילו בתים יש עדיין מלאי מתוק."
        >
          <div className="flex flex-wrap gap-2">
            {(["green", "yellow", "red"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => toggleCandyLevel(level)}
                className={cn(
                  "group relative flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm transition-all hover:-translate-y-0.5",
                  filters.candyLevels.includes(level)
                    ? "bg-white/10 text-white"
                    : "text-slate-200/80",
                )}
              >
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full transition-all group-hover:scale-110",
                    candyIndicatorClasses[level],
                  )}
                />
                {candyLabels[level]}
                {filters.candyLevels.includes(level) && (
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                )}
              </button>
            ))}
          </div>
        </CardGroup>

        <CardGroup
          title="רמת מפחיד"
          icon={<Ghost className="h-4 w-4 text-purple-300" />}
          description="בחרו את האווירה שמתאימה למשפחה."
        >
          <div className="flex flex-wrap gap-2">
            {(["low", "medium", "high"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => toggleScareLevel(level)}
                className={cn(
                  "rounded-full border border-white/10 px-3 py-1.5 text-sm transition-all hover:-translate-y-0.5",
                  filters.scareLevels.includes(level)
                    ? "bg-gradient-to-l from-[var(--color-accent-muted)] to-white/10 text-white shadow-lg"
                    : "text-slate-200/80",
                )}
              >
                {scareLevelLabels[level]}
              </button>
            ))}
          </div>
        </CardGroup>

        <CardGroup
          title="התאמות"
          icon={<Accessibility className="h-4 w-4 text-cyan-300" />}
          description="נגישות וצרכים תזונתיים."
        >
          <div className="flex flex-wrap gap-2">
            {Object.entries(accessibilityLabels).map(([value, label]) => (
              <Chip
                key={value}
                active={filters.accessibility.includes(value)}
                onClick={() => toggleAccessibility(value)}
              >
                {label}
              </Chip>
            ))}
            {Object.entries(dietaryLabels).map(([value, label]) => (
              <Chip
                key={value}
                active={filters.dietary.includes(value)}
                onClick={() => toggleDietary(value)}
              >
                {label}
              </Chip>
            ))}
          </div>
        </CardGroup>
      </section>

      <section className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/5 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <Gauge className="h-4 w-4 text-sky-300" />
          <label className="text-sm text-slate-200/85">
            רדיוס חיפוש:{" "}
            <span className="font-medium text-white">
              {filters.radiusKm ?? 2} ק&quot;מ
            </span>
          </label>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={filters.radiusKm ?? 2}
          className="w-48 accent-[var(--color-accent-strong)]"
          onChange={(event) => setRadius(Number(event.target.value))}
        />
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm transition-all",
            filters.openNow
              ? "bg-emerald-400/10 text-emerald-200"
              : "text-slate-200/80 hover:bg-white/10",
          )}
          onClick={toggleOpenNow}
        >
          <Activity className="h-4 w-4" />
          פתוח עכשיו
        </button>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm transition-all",
            filters.onlyFavorites
              ? "bg-pink-400/10 text-pink-200"
              : "text-slate-200/80 hover:bg-white/10",
          )}
          onClick={toggleFavorites}
        >
          <Candy className="h-4 w-4" />
          מועדפים
        </button>
        <button
          type="button"
          onClick={resetFilters}
          className="ml-auto flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-200/75 transition-all hover:bg-white/10"
        >
          איפוס
          <RefreshCw className="h-4 w-4" />
        </button>
      </section>
    </header>
  );
}

type CardGroupProps = {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
};

function CardGroup({ title, description, icon, children }: CardGroupProps) {
  return (
    <article className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/10">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-slate-300/80">{description}</p>
        </div>
      </div>
      {children}
    </article>
  );
}

type ChipProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
};

function Chip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border border-white/10 px-3 py-1.5 text-xs transition-all hover:-translate-y-0.5",
        active
          ? "bg-white/15 text-white shadow-lg backdrop-blur-sm"
          : "text-slate-200/80",
      )}
    >
      {children}
    </button>
  );
}
