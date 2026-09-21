"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, MapPin, Navigation, Undo2 } from "lucide-react";
import { HouseCard } from "@/components/house-card";
import { Button } from "@/components/ui/button";
import { SkipSign, VisitedSign } from "@/components/visit-marks";
import { houseHeadline } from "@/lib/labels";
import type { SkippedHouseMeta } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export type RouteListItem = {
  house: PublicHouse;
  order: number;
  hop: string;
  skipped: boolean;
  visitedTail?: boolean;
};

function RouteLeg({ label }: { label: string }) {
  return (
    <div className="route-list-leg">
      <span className="route-list-leg-line" aria-hidden="true" />
      <span className="route-list-leg-label">{label}</span>
    </div>
  );
}

function RouteTailRow({
  house,
  kind,
  skipMeta,
  onRestore,
  onToggleVisited,
  catalogSource,
  liked,
  onToggleLike,
  visited,
  onSkipHouse,
  admin,
  canEditHouse,
  onShowOnMap,
  onEditHouse,
  editingId,
}: {
  house: PublicHouse;
  kind: "skipped" | "visited";
  skipMeta?: SkippedHouseMeta;
  onRestore?: () => void;
  onToggleVisited?: () => void;
  catalogSource?: string | null;
  liked?: boolean;
  onToggleLike?: () => void;
  visited?: boolean;
  onSkipHouse?: () => void;
  admin?: boolean;
  canEditHouse?: boolean;
  onShowOnMap?: () => void;
  onEditHouse?: () => void;
  editingId?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="route-tail-row">
      <div className="route-tail-header">
        <button
          type="button"
          className="route-tail-toggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {kind === "skipped" ? <SkipSign /> : <VisitedSign />}
          <span className="route-tail-title">{houseHeadline(house)}</span>
          <ChevronDown className={cn("route-tail-chevron", open && "is-open")} aria-hidden />
        </button>
        {kind === "skipped" && onRestore ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="route-tail-action"
            onClick={onRestore}
          >
            <Undo2 className="size-3.5" />
            החזרה
          </Button>
        ) : null}
        {kind === "visited" && onToggleVisited ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="route-tail-action"
            onClick={onToggleVisited}
          >
            <Undo2 className="size-3.5" />
            לא ביקרתי
          </Button>
        ) : null}
      </div>
      {open ? (
        <div className="route-tail-body">
          <HouseCard
            house={house}
            catalogSource={catalogSource}
            liked={liked}
            onToggleLike={onToggleLike}
            visited={visited}
            onToggleVisited={onToggleVisited}
            onSkip={kind === "visited" ? onSkipHouse : undefined}
            skipped={kind === "skipped"}
            skipMeta={skipMeta}
            onRestoreRoute={kind === "skipped" ? onRestore : undefined}
            canEdit={canEditHouse}
            admin={admin}
            onShowOnMap={onShowOnMap}
            onToggleEdit={onEditHouse}
            editing={editingId === house.id}
            expanded
          />
        </div>
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
  focusId,
  catalogSource,
  likedIds,
  onToggleLike,
  visitedIds,
  onToggleVisited,
  onSkipHouse,
  onRestoreHouse,
  skipMetaFor,
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
  focusId?: string | null;
  catalogSource?: string | null;
  likedIds?: string[];
  onToggleLike?: (id: string) => void;
  visitedIds?: string[];
  onToggleVisited?: (id: string) => void;
  onSkipHouse?: (id: string) => void;
  onRestoreHouse?: (id: string) => void;
  skipMetaFor?: (id: string) => SkippedHouseMeta | undefined;
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
        {items.map(({ house, order, hop, skipped, visitedTail }, i) => {
          const showSkippedHeading = skipped && (i === 0 || !items[i - 1]!.skipped);
          const showVisitedHeading =
            visitedTail && (i === 0 || !items[i - 1]?.visitedTail);
          const isTail = skipped || visitedTail;
          return (
            <li
              key={house.id}
              ref={house.id === focusId ? focusRef : undefined}
              className={cn(
                house.id === focusId && "house-list-focus",
                skipped && "route-list-skipped",
                visitedTail && "route-list-visited",
              )}
            >
              {showVisitedHeading ? (
                <p className="route-list-visited-heading">ביקרתם</p>
              ) : null}
              {showSkippedHeading ? (
                <p className="route-list-skipped-heading">דילגתם על הבתים האלה</p>
              ) : null}
              {hop ? <RouteLeg label={hop} /> : null}
              {isTail ? (
                <RouteTailRow
                  house={house}
                  kind={skipped ? "skipped" : "visited"}
                  skipMeta={skipMetaFor?.(house.id)}
                  onRestore={
                    skipped && onRestoreHouse ? () => onRestoreHouse(house.id) : undefined
                  }
                  onToggleVisited={
                    onToggleVisited ? () => onToggleVisited(house.id) : undefined
                  }
                  catalogSource={catalogSource}
                  liked={likedIds?.includes(house.id)}
                  onToggleLike={onToggleLike ? () => onToggleLike(house.id) : undefined}
                  visited={visitedIds?.includes(house.id)}
                  onSkipHouse={onSkipHouse ? () => onSkipHouse(house.id) : undefined}
                  admin={admin}
                  canEditHouse={canEditHouse?.(house.id)}
                  onShowOnMap={onShowOnMap ? () => onShowOnMap(house.id) : undefined}
                  onEditHouse={onEditHouse ? () => onEditHouse(house.id, i + 1) : undefined}
                  editingId={editingId}
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
                    onToggleEdit={onEditHouse ? () => onEditHouse(house.id, i + 1) : undefined}
                    editing={editingId === house.id}
                    index={order}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
