"use client";

import { Heart, List, MapPinned, Route } from "lucide-react";
import { FilterTrigger } from "@/components/filter-menu";
import { OriginTrigger } from "@/components/origin-picker";
import { CsvExportButton } from "@/components/csv-export-button";
import { PingPongMarquee } from "@/components/neighborhood-marquee";
import { Input } from "@/components/ui/input";
import { UnvisitedSign } from "@/components/visit-marks";
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
  unvisitedOnly,
  onToggleLikedFilter,
  onToggleUnvisitedFilter,
  activeFilterCount,
  onOpenFilters,
  originShifted,
  onOpenOriginPicker,
  routeMode,
  onToggleRoute,
  houses,
  includeTraffic,
  listQuery,
  onListQueryChange,
  routeTicker,
}: {
  view: HomeView;
  onViewChange: (view: HomeView) => void;
  onListView: () => void;
  likedOnly: boolean;
  unvisitedOnly: boolean;
  onToggleLikedFilter: () => void;
  onToggleUnvisitedFilter: () => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
  originShifted: boolean;
  onOpenOriginPicker: () => void;
  routeMode: boolean;
  onToggleRoute: () => void;
  houses: PublicHouse[];
  includeTraffic?: boolean;
  listQuery: string;
  onListQueryChange: (value: string) => void;
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
        <button
          type="button"
          aria-label={likedOnly ? "מציגים שמורים בלבד" : "סינון שמורים"}
          aria-pressed={likedOnly}
          onClick={onToggleLikedFilter}
          className={cn(
            "relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
            likedOnly
              ? "bg-orange-500 text-black"
              : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25",
          )}
        >
          <Heart className={cn("size-4", likedOnly && "fill-current")} />
        </button>
        <button
          type="button"
          aria-label={unvisitedOnly ? "מציגים לא ביקרתי בלבד" : "סינון לא ביקרתי"}
          aria-pressed={unvisitedOnly}
          onClick={onToggleUnvisitedFilter}
          className={cn(
            "relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
            unvisitedOnly
              ? "bg-orange-500 text-black"
              : "bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25",
          )}
        >
          <UnvisitedSign className="size-4" />
        </button>
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
      {view === "list" && !routeMode ? (
        <div className="mt-2 w-full min-w-0">
          <Input
            id="house-search"
            type="search"
            value={listQuery}
            onChange={(e) => onListQueryChange(e.target.value)}
            placeholder="חיפוש לפי שם או רחוב…"
            aria-label="חיפוש בית"
            autoComplete="off"
            enterKeyHint="search"
            className="h-10 w-full min-w-0 bg-[#1d1028] text-base"
          />
        </div>
      ) : null}
    </div>
  );
}
