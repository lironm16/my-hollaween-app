"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { HouseCard } from "@/components/house-card";
import { distanceMeters } from "@/lib/geo";
import { effectiveVisit, isFrozen } from "@/lib/house-state";
import type { PublicHouse } from "@/lib/types";

export function HouseList({
  houses,
  onOpen,
  origin,
  likedIds,
  onToggleLike,
}: {
  houses: PublicHouse[];
  onOpen: (house: PublicHouse) => void;
  origin?: { lat: number; lng: number } | null;
  likedIds?: string[];
  onToggleLike?: (id: string) => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim();
    return houses
      .filter((h) => {
        if (!needle) return true;
        const text = `${h.name} ${h.address} ${h.description} ${h.id} ${h.arrival ?? ""}`;
        return text.includes(needle);
      })
      .map((h) => ({
        h,
        d: origin ? distanceMeters(origin, h) : undefined,
      }))
      .sort((a, b) => {
        if (isFrozen(a.h) !== isFrozen(b.h)) return isFrozen(a.h) ? 1 : -1;
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
        <p className="mt-2 text-sm">נסו לבטל נגיש, ללא גלוטן או שמרתי.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 py-3">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="חיפוש לפי שם או רחוב…"
        className="h-10 bg-[#1d1028] text-base"
      />
      {origin ? (
        <p className="text-[11px] text-violet-300">ממוין לפי מרחק מכם</p>
      ) : null}
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-violet-300">אין בתים שמתאימים לחיפוש.</p>
      ) : (
        filtered.map(({ h, d }) => (
          <HouseCard
            key={h.id}
            house={h}
            distanceM={d}
            onOpen={() => onOpen(h)}
            liked={likedIds?.includes(h.id)}
            onToggleLike={onToggleLike ? () => onToggleLike(h.id) : undefined}
          />
        ))
      )}
    </div>
  );
}
