"use client";

import { useEffect, useRef } from "react";
import { MapPin, Navigation, Undo2 } from "lucide-react";
import { SkipSign } from "@/components/visit-marks";
import { Button } from "@/components/ui/button";
import { HouseCard } from "@/components/house-card";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export type RouteListItem = {
  house: PublicHouse;
  order: number;
  hop: string;
  skipped: boolean;
};

function RouteLeg({ label }: { label: string }) {
  return (
    <div className="route-list-leg">
      <span className="route-list-leg-line" aria-hidden="true" />
      <span className="route-list-leg-label">{label}</span>
    </div>
  );
}

function RouteSkippedRow({
  house,
  onRestore,
  onOpen,
}: {
  house: PublicHouse;
  onRestore?: () => void;
  onOpen?: () => void;
}) {
  return (
    <div className="route-skipped-row">
      <button
        type="button"
        className="route-skipped-main"
        onClick={onOpen}
        aria-label={`${houseHeadline(house)} — דילגתי`}
      >
        <SkipSign />
        <span className="route-skipped-name">{houseHeadline(house)}</span>
      </button>
      {onRestore ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="route-skipped-restore shrink-0"
          onClick={onRestore}
        >
          <Undo2 className="size-3.5" />
          החזרה
        </Button>
      ) : null}
    </div>
  );
}

export function RouteList({
  items,
  originLabel,
  startedFrom,
  hasGps,
  onRequestLocation,
  onChangeOrigin,
  onSelectHouse,
  selectedId,
  focusId,
  catalogSource,
  likedIds,
  onToggleLike,
  visitedIds,
  onToggleVisited,
  onSkipHouse,
  onRestoreHouse,
  admin = false,
  canEditHouse,
  onShowOnMap,
  onEditHouse,
  editingId,
}: {
  items: RouteListItem[];
  originLabel?: string;
  startedFrom?: "gps" | "neighborhood" | "custom";
  hasGps: boolean;
  onRequestLocation?: () => void;
  onChangeOrigin?: () => void;
  onSelectHouse: (id: string, index: number) => void;
  selectedId?: string | null;
  focusId?: string | null;
  catalogSource?: string | null;
  likedIds?: string[];
  onToggleLike?: (id: string) => void;
  visitedIds?: string[];
  onToggleVisited?: (id: string) => void;
  onSkipHouse?: (id: string) => void;
  onRestoreHouse?: (id: string) => void;
  admin?: boolean;
  canEditHouse?: (id: string) => boolean;
  onShowOnMap?: (id: string) => void;
  onEditHouse?: (id: string, index: number) => void;
  editingId?: string | null;
}) {
  const focusRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (!focusId) return;
    focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId]);

  const gpsAction =
    !hasGps && onRequestLocation ? (
      <Button type="button" size="sm" variant="outline" className="mt-2" onClick={onRequestLocation}>
        <Navigation className="size-3.5" />
        הפעילו מיקום
      </Button>
    ) : null;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-violet-200">
        {gpsAction}
        <p className="font-display text-2xl text-orange-300">אין עצירות במסלול</p>
        <p className="mt-2 text-base">
          שנו סינון כדי לראות בתים במסלול. בתים שכבר סימנתם כביקור לא נכללים במסלול.
        </p>
      </div>
    );
  }

  const startLabel = originLabel || (startedFrom === "gps" ? "מיקום נוכחי" : "ממרכז השכונה");

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col px-3 py-3">
      <ol className="route-list">
        <li className="route-list-card">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-black">
              <MapPin className="size-4" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-base font-medium text-orange-100">נקודת התחלה</p>
                {onChangeOrigin ? (
                  <Button type="button" size="sm" variant="outline" onClick={onChangeOrigin}>
                    שינוי
                  </Button>
                ) : null}
              </div>
              <p className="mt-0.5 text-base text-violet-300">{startLabel}</p>
              {gpsAction}
            </div>
          </div>
        </li>
        {items.map(({ house, order, hop, skipped }, i) => (
          <li
            key={house.id}
            ref={house.id === focusId ? focusRef : undefined}
            className={cn(house.id === focusId && "house-list-focus", skipped && "route-list-skipped")}
          >
            <RouteLeg label={hop} />
            {skipped ? (
              <RouteSkippedRow
                house={house}
                onRestore={onRestoreHouse ? () => onRestoreHouse(house.id) : undefined}
                onOpen={() => onSelectHouse(house.id, i + 1)}
              />
            ) : (
              <div className="route-list-house">
                <HouseCard
                  house={house}
                  catalogSource={catalogSource}
                  liked={likedIds?.includes(house.id)}
                  onToggleLike={onToggleLike ? () => onToggleLike(house.id) : undefined}
                  visited={visitedIds?.includes(house.id)}
                  onToggleVisited={onToggleVisited ? () => onToggleVisited(house.id) : undefined}
                  onSkip={onSkipHouse ? () => onSkipHouse(house.id) : undefined}
                  canEdit={Boolean(canEditHouse?.(house.id))}
                  admin={admin}
                  onShowOnMap={onShowOnMap ? () => onShowOnMap(house.id) : undefined}
                  onOpen={() => onSelectHouse(house.id, i + 1)}
                  onToggleEdit={onEditHouse ? () => onEditHouse(house.id, i + 1) : undefined}
                  editing={editingId === house.id}
                  index={order}
                />
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
