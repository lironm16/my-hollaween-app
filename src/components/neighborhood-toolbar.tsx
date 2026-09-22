"use client";

import { List, MapPinned, Route } from "lucide-react";
import { FilterTrigger } from "@/components/filter-menu";
import { OriginTrigger } from "@/components/origin-picker";
import { CsvExportButton } from "@/components/csv-export-button";
import { PingPongMarquee } from "@/components/neighborhood-marquee";
import type { HomeView } from "@/lib/home-view";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

function ViewToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "app-toolbar__btn inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
        active ? "bg-orange-500 text-black" : "text-violet-200",
      )}
    >
      <span className="[&_svg]:size-5">{icon}</span>
    </button>
  );
}

function StatusTicker({ text }: { text: string }) {
  return (
    <div className="mt-1 flex min-w-0 items-center">
      <PingPongMarquee text={text} className="flex-1 text-base text-orange-100" />
    </div>
  );
}

export function NeighborhoodToolbar({
  view,
  onViewChange,
  onListView,
  likedOnly,
  activeFilterCount,
  onOpenFilters,
  originShifted,
  onOpenOriginPicker,
  routeMode,
  onToggleRoute,
  houses,
  routeTicker,
  routeUpdateCount = 0,
  routeUpdateTicker = null,
  onOpenRouteUpdates,
  floating = false,
}: {
  view: HomeView;
  onViewChange: (view: HomeView) => void;
  onListView: () => void;
  likedOnly: boolean;
  activeFilterCount: number;
  onOpenFilters: () => void;
  originShifted: boolean;
  onOpenOriginPicker: () => void;
  routeMode: boolean;
  onToggleRoute: () => void;
  houses: PublicHouse[];
  routeTicker: string | null;
  routeUpdateCount?: number;
  routeUpdateTicker?: string | null;
  onOpenRouteUpdates?: () => void;
  /** Float over map/list instead of a fixed strip under the header. */
  floating?: boolean;
}) {
  return (
    <div
      className={cn(
        "app-toolbar",
        floating
          ? "app-toolbar--floating rounded-2xl border-0 bg-[#160b1f]/92 px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.45)] ring-1 ring-orange-500/30 backdrop-blur-md"
          : "relative z-40 border-b border-orange-500/15 bg-[#12081a]/80 px-3 py-2",
      )}
      style={floating ? undefined : { flexShrink: 0 }}
    >
      <div className={cn("app-toolbar__row flex w-full min-w-0 items-center justify-between gap-2", floating && "gap-1")}>
        <div className="flex shrink-0 rounded-xl bg-[#261536] p-1 ring-1 ring-orange-400/40">
          <ViewToggle
            active={view === "map"}
            onClick={() => onViewChange("map")}
            icon={<MapPinned />}
            label="מפה"
          />
          <ViewToggle
            active={view === "list"}
            onClick={onListView}
            icon={<List />}
            label="רשימה"
          />
        </div>
        <FilterTrigger activeCount={activeFilterCount} onClick={onOpenFilters} />
        <OriginTrigger shifted={originShifted} onClick={onOpenOriginPicker} />
        <button
          type="button"
          aria-label={
            routeMode
              ? routeUpdateCount > 0
                ? `${routeUpdateCount} עדכונים במסלול`
                : "יציאה מהמסלול"
              : "מסלול"
          }
          aria-pressed={routeMode}
          onClick={onToggleRoute}
          className={cn(
            "app-toolbar__btn relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
            routeMode
              ? "bg-orange-500 text-black"
              : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25",
          )}
        >
          <Route className="size-5" />
          {routeMode && routeUpdateCount > 0 ? (
            <span className="absolute -top-1 -start-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-amber-400 px-1 text-[0.65rem] font-bold leading-none text-black ring-2 ring-[#12081a]">
              {routeUpdateCount > 9 ? "9+" : routeUpdateCount}
            </span>
          ) : null}
        </button>
        <CsvExportButton houses={houses} kind={likedOnly ? "liked" : "list"} />
      </div>
      {routeUpdateTicker && onOpenRouteUpdates ? (
        <button
          type="button"
          className="mt-1 flex min-w-0 items-center rounded-lg bg-amber-950/50 px-2 py-1 ring-1 ring-amber-500/30"
          onClick={onOpenRouteUpdates}
        >
          <PingPongMarquee text={routeUpdateTicker} className="flex-1 text-base text-amber-100" />
        </button>
      ) : routeTicker ? (
        <StatusTicker text={routeTicker} />
      ) : null}
    </div>
  );
}
