"use client";

import { useMemo } from "react";
import { HouseCard } from "@/components/house-card";
import { distanceMeters } from "@/lib/geo";
import { effectiveVisit } from "@/lib/house-state";
import type { PublicHouse } from "@/lib/types";

export function HouseList({
  houses,
  query = "",
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
  selectedId,
  editingId,
}: {
  houses: PublicHouse[];
  query?: string;
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
  selectedId?: string | null;
  editingId?: string | null;
}) {
  const filtered = useMemo(() => {
    const needle = query.trim();
    return houses
      .filter((h) => {
        if (!needle) return true;
        const text = `${h.name} ${h.address} ${h.description} ${h.arrival ?? ""}`;
        return text.includes(needle);
      })
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
  }, [houses, query, origin]);

  if (houses.length === 0) {
    return (
      <div className="px-4 py-16 text-center text-violet-200">
        <p className="font-display text-2xl text-orange-300">אין בתים שמתאימים לסינון</p>
        <p className="mt-2 text-base">נסו לבטל סינון בתפריטי שכונה, רמת פחד, עוד או רגישויות.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-3 px-3 py-3">
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-violet-300">אין בתים שמתאימים לחיפוש.</p>
      ) : (
        filtered.map(({ h, d }, i) => (
          <HouseCard
            key={h.id}
            index={i + 1}
            house={h}
            distanceM={d}
            catalogSource={catalogSource}
            liked={likedIds?.includes(h.id)}
            onToggleLike={onToggleLike ? () => onToggleLike(h.id) : undefined}
            visited={visitedIds?.includes(h.id)}
            onToggleVisited={onToggleVisited ? () => onToggleVisited(h.id) : undefined}
            canEdit={Boolean(canEditHouse?.(h.id))}
            admin={admin}
            onShowOnMap={onShowOnMap ? () => onShowOnMap(h.id) : undefined}
            onOpen={onSelectHouse ? () => onSelectHouse(h.id, i + 1) : undefined}
            onToggleEdit={onEditHouse ? () => onEditHouse(h.id, i + 1) : undefined}
            editing={editingId === h.id}
          />
        ))
      )}
    </div>
  );
}
