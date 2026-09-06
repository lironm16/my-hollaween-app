"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { HouseCard } from "@/components/house-card";
import { CsvExportButton } from "@/components/csv-export-button";
import { distanceMeters } from "@/lib/geo";
import { effectiveVisit } from "@/lib/house-state";
import type { HouseTraffic } from "@/lib/traffic";
import type { PublicHouse } from "@/lib/types";

export function HouseList({
  houses,
  origin,
  catalogSource,
  likedIds,
  onToggleLike,
  visitedIds,
  onToggleVisited,
  traffic,
  exportKind = "list",
  ownedIds = [],
  admin = false,
  onlineDevices = null,
}: {
  houses: PublicHouse[];
  origin?: { lat: number; lng: number } | null;
  catalogSource?: string | null;
  likedIds?: string[];
  onToggleLike?: (id: string) => void;
  visitedIds?: string[];
  onToggleVisited?: (id: string) => void;
  traffic?: Record<string, HouseTraffic>;
  exportKind?: "liked" | "list";
  ownedIds?: string[];
  admin?: boolean;
  onlineDevices?: number | null;
}) {
  const [q, setQ] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim();
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
  }, [houses, q, origin]);

  if (houses.length === 0) {
    return (
      <div className="px-4 py-16 text-center text-violet-200">
        <p className="font-display text-2xl text-orange-300">אין בתים שמתאימים לסינון</p>
        <p className="mt-2 text-base">נסו לבטל סינון בתפריטי שכונה, רמת פחד, עוד או רגישויות.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 py-3">
      <div className="flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="חיפוש לפי שם או רחוב…"
          className="h-10 min-w-0 flex-1 bg-[#1d1028] text-base"
        />
        <CsvExportButton houses={houses} traffic={traffic} kind={exportKind} />
        <span className="shrink-0 text-base text-violet-300">
          {houses.length} בתים
          {admin && onlineDevices != null ? ` · ${onlineDevices} במכשירים` : ""}
        </span>
      </div>
      {origin ? (
        <p className="text-base text-violet-300">ממוין לפי מרחק מכם</p>
      ) : null}
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-violet-300">אין בתים שמתאימים לחיפוש.</p>
      ) : (
        filtered.map(({ h, d }) => (
          <HouseCard
            key={h.id}
            house={h}
            distanceM={d}
            catalogSource={catalogSource}
            expanded={expandedId === h.id}
            onToggle={() => setExpandedId((id) => (id === h.id ? null : h.id))}
            liked={likedIds?.includes(h.id)}
            onToggleLike={onToggleLike ? () => onToggleLike(h.id) : undefined}
            visited={visitedIds?.includes(h.id)}
            onToggleVisited={onToggleVisited ? () => onToggleVisited(h.id) : undefined}
            emphasizeTraffic={admin || ownedIds.includes(h.id)}
          />
        ))
      )}
    </div>
  );
}
