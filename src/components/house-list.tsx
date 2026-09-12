"use client";

import { useEffect, useMemo, useRef } from "react";
import { HouseCard } from "@/components/house-card";
import { distanceMeters } from "@/lib/geo";
import { effectiveVisit } from "@/lib/house-state";
import type { PublicHouse } from "@/lib/types";

export function HouseList({
  houses,
  origin,
  catalogSource,
  likedIds,
  onToggleLike,
  visitedIds,
  onToggleVisited,
  admin = false,
  canEditHouse,
  onShowOnMap,
  onSelectHouse,
  onEditHouse,
  skippedIds,
  onSkipHouse,
  onRestoreHouse,
  emptyKind = "default",
  selectedId,
  focusId,
  editingId,
}: {
  houses: PublicHouse[];
  origin?: { lat: number; lng: number } | null;
  catalogSource?: string | null;
  likedIds?: string[];
  onToggleLike?: (id: string) => void;
  visitedIds?: string[];
  onToggleVisited?: (id: string) => void;
  admin?: boolean;
  canEditHouse?: (id: string) => boolean;
  onShowOnMap?: (id: string) => void;
  onSelectHouse?: (id: string, index: number) => void;
  onEditHouse?: (id: string, index: number) => void;
  skippedIds?: string[];
  onSkipHouse?: (id: string) => void;
  onRestoreHouse?: (id: string) => void;
  emptyKind?: "default" | "skipped";
  selectedId?: string | null;
  focusId?: string | null;
  editingId?: string | null;
}) {
  const focusRef = useRef<HTMLDivElement | null>(null);
  const filtered = useMemo(() => {
    return houses
      .map((h) => ({
        h,
        d: origin ? distanceMeters(origin, h) : undefined,
      }))
      .sort((a, b) => {
        const va = effectiveVisit(a.h) === "closed";
        const vb = effectiveVisit(b.h) === "closed";
        if (va !== vb) return va ? 1 : -1;
        if (a.d !== undefined && b.d !== undefined) return a.d - b.d;
        return a.h.name.localeCompare(b.h.name, "he");
      });
  }, [houses, origin]);

  useEffect(() => {
    if (!focusId) return;
    focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId]);

  if (houses.length === 0) {
    return (
      <div className="px-4 py-16 text-center text-violet-200">
        {emptyKind === "skipped" ? (
          <>
            <p className="font-display text-2xl text-orange-300">אין בתים שדילגתם עליהם</p>
            <p className="mt-2 text-base">בתים שתדלגו עליהם במסלול יופיעו כאן.</p>
          </>
        ) : (
          <>
            <p className="font-display text-2xl text-orange-300">אין בתים שמתאימים לסינון</p>
            <p className="mt-2 text-base">נסו לבטל סינון בתפריטי שכונה, רמת פחד, עוד או רגישויות.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-3 px-3 py-3">
      {filtered.map(({ h, d }, i) => (
        <div
          key={h.id}
          ref={h.id === focusId ? focusRef : undefined}
          className={h.id === focusId ? "house-list-focus" : undefined}
        >
        <HouseCard
          index={i + 1}
          house={h}
          distanceM={d}
          catalogSource={catalogSource}
          liked={likedIds?.includes(h.id)}
          onToggleLike={onToggleLike ? () => onToggleLike(h.id) : undefined}
          visited={visitedIds?.includes(h.id)}
          onToggleVisited={onToggleVisited ? () => onToggleVisited(h.id) : undefined}
          skipped={skippedIds?.includes(h.id)}
          onSkip={onSkipHouse ? () => onSkipHouse(h.id) : undefined}
          onRestoreRoute={onRestoreHouse ? () => onRestoreHouse(h.id) : undefined}
          canEdit={Boolean(canEditHouse?.(h.id))}
          admin={admin}
          onShowOnMap={onShowOnMap ? () => onShowOnMap(h.id) : undefined}
          onOpen={onSelectHouse ? () => onSelectHouse(h.id, i + 1) : undefined}
          onToggleEdit={onEditHouse ? () => onEditHouse(h.id, i + 1) : undefined}
          editing={editingId === h.id}
        />
        </div>
      ))}
    </div>
  );
}
