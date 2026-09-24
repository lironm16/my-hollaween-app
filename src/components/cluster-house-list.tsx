"use client";

import {
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { HouseMapPinIcon } from "@/components/house-map-pin-icon";
import { HouseTitleMarkers } from "@/components/house-title-markers";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD_PX = 56;

export function clusterHouseIndex(houses: PublicHouse[], houseId: string) {
  const index = houses.findIndex((item) => item.id === houseId);
  return index >= 0 ? index + 1 : null;
}

export function adjacentClusterHouseId(
  houses: PublicHouse[],
  houseId: string,
  delta: -1 | 1,
) {
  const index = houses.findIndex((item) => item.id === houseId);
  if (index < 0) return null;
  return houses[index + delta]?.id ?? null;
}

export function ClusterHouseNav({
  houses,
  selectedId,
  onPrev,
  onNext,
  onBack,
  backLabel = "חזרה לרשימה",
}: {
  houses: PublicHouse[];
  selectedId: string;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
  backLabel?: string;
}) {
  const index = clusterHouseIndex(houses, selectedId) ?? 1;
  const total = houses.length;
  const canPrev = index > 1;
  const canNext = index < total;

  return (
    <div className="cluster-house-nav">
      <div className="cluster-house-nav-row">
        <button
          type="button"
          className="cluster-house-nav-back"
          onClick={onBack}
        >
          <ArrowRight className="size-4 shrink-0" aria-hidden />
          {backLabel}
        </button>
        <div className="cluster-house-nav-pager">
          <button
            type="button"
            className="cluster-house-nav-step"
            disabled={!canPrev}
            aria-label="בית קודם"
            onClick={onPrev}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
          <span className="cluster-house-nav-count tabular-nums" aria-live="polite">
            {index} / {total}
          </span>
          <button
            type="button"
            className="cluster-house-nav-step"
            disabled={!canNext}
            aria-label="בית הבא"
            onClick={onNext}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <p className="cluster-house-nav-hint">החלקה לצדדים לבית הקודם או הבא</p>
    </div>
  );
}

export function ClusterHouseSwipeArea({
  onPrev,
  onNext,
  canPrev,
  canNext,
  children,
}: {
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  children: ReactNode;
}) {
  const swipe = useRef<{ x: number; y: number; active: boolean } | null>(null);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest(
        "button, a, input, textarea, select, label, [role='button'], [role='tab']",
      )
    ) {
      return;
    }
    swipe.current = { x: event.clientX, y: event.clientY, active: true };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!swipe.current?.active) return;
      const start = swipe.current;
      swipe.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return;
      if (dx > 0 && canPrev) {
        onPrev();
        return;
      }
      if (dx < 0 && canNext) {
        onNext();
      }
    },
    [canNext, canPrev, onNext, onPrev],
  );

  const onPointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    swipe.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return (
    <div
      className="cluster-house-swipe-area"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {children}
    </div>
  );
}

/** @deprecated Use ClusterHouseNav */
export function ClusterHouseBackLink({
  index,
  total,
  onBack,
}: {
  index: number;
  total: number;
  onBack: () => void;
}) {
  return (
    <button
      type="button"
      className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-orange-200/90 hover:text-orange-50"
      onClick={onBack}
    >
      <ArrowRight className="size-4 shrink-0" aria-hidden />
      חזרה לרשימה
      <span className="text-orange-300/80">
        · {index} מתוך {total}
      </span>
    </button>
  );
}

export function ClusterHouseList({
  houses,
  selectedId,
  now,
  skipped,
  filteredOut,
  visited,
  gemCollected,
  liked,
  onSelect,
}: {
  houses: PublicHouse[];
  selectedId?: string | null;
  now?: Date;
  skipped?: (id: string) => boolean;
  filteredOut?: (id: string) => boolean;
  visited?: (id: string) => boolean;
  gemCollected?: (id: string) => boolean;
  liked?: (id: string) => boolean;
  onSelect: (id: string) => void;
}) {
  const clusterNow = now ?? new Date();
  return (
    <ul className="cluster-house-list space-y-2">
      {houses.map((item, index) => (
        <li key={item.id}>
          <button
            type="button"
            className={cn(
              "cluster-house-list-row flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-base ring-1 transition-colors",
              item.id === selectedId
                ? "bg-[#261536] text-orange-50 ring-orange-400/50"
                : "bg-[#1d1028] text-orange-50 ring-orange-500/25 hover:bg-[#261536]",
              filteredOut?.(item.id) && "opacity-60",
            )}
            onClick={() => onSelect(item.id)}
          >
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-sm font-semibold text-orange-200 tabular-nums"
              aria-hidden
            >
              {index + 1}
            </span>
            <span className="cluster-house-list-pin-wrap shrink-0" dir="ltr">
              <HouseMapPinIcon
                house={item}
                now={clusterNow}
                skipped={skipped?.(item.id)}
                filteredOut={filteredOut?.(item.id)}
                visited={visited?.(item.id)}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                <HouseTitleMarkers liked={liked?.(item.id)} gemCollected={gemCollected?.(item.id)} />
                {houseHeadline(item)}
              </span>
              {item.arrival?.trim() ? (
                <span className="mt-0.5 block truncate text-sm text-violet-300/90">
                  {item.arrival.trim()}
                </span>
              ) : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
