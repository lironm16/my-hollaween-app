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
        "inline-flex h-9 w-9 items-center justify-center rounded-lg",
        active ? "bg-orange-500 text-black" : "text-violet-200",
      )}
    >
      {icon}
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
  includeTraffic,
  routeTicker,
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
  includeTraffic?: boolean;
  routeTicker: string | null;
}) {
  return (
    <div
      className="app-toolbar relative z-40 border-b border-orange-500/15 bg-[#12081a]/80 px-3 py-2"
      style={{ flexShrink: 0 }}
    >
      <div className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden">
        <div className="flex min-w-0 shrink rounded-xl bg-[#261536] p-0.5 ring-1 ring-orange-400/40">
          <ViewToggle
            active={view === "map"}
            onClick={() => onViewChange("map")}
            icon={<MapPinned className="size-4" />}
            label="מפה"
          />
          <ViewToggle
            active={view === "list"}
            onClick={onListView}
            icon={<List className="size-4" />}
            label="רשימה"
          />
        </div>
        <FilterTrigger activeCount={activeFilterCount} onClick={onOpenFilters} />
        <OriginTrigger shifted={originShifted} onClick={onOpenOriginPicker} />
        <button
          type="button"
          aria-label={routeMode ? "יציאה מהמסלול" : "מסלול"}
          aria-pressed={routeMode}
          onClick={onToggleRoute}
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
            routeMode
              ? "bg-orange-500 text-black"
              : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25",
          )}
        >
          <Route className="size-4" />
        </button>
        <CsvExportButton
          houses={houses}
          kind={likedOnly ? "liked" : "list"}
          includeTraffic={includeTraffic}
        />
      </div>
      {routeTicker ? <StatusTicker text={routeTicker} /> : null}
    </div>
  );
}
