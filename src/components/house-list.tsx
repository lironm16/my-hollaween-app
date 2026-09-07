"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { HousePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { HouseCard } from "@/components/house-card";
import { PingPongMarquee } from "@/components/neighborhood-marquee";
import { distanceMeters } from "@/lib/geo";
import { effectiveVisit } from "@/lib/house-state";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ListStatusLabels({
  statusText,
  extra,
}: {
  statusText: string;
  extra?: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <p className="text-base text-violet-300">ממוין לפי מרחק</p>
      <div className="rounded-2xl bg-[#1d1028] p-3 ring-1 ring-orange-500/20">
        <PingPongMarquee text={statusText} className="text-base font-medium text-orange-100" />
        {extra}
      </div>
    </div>
  );
}

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
  editCodeFor,
  onHouseUpdated,
  onHouseDeleted,
  onShowOnMap,
  statusText,
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
  editCodeFor?: (id: string) => string | undefined;
  onHouseUpdated?: (house: PublicHouse) => void;
  onHouseDeleted?: (id: string) => void;
  onShowOnMap?: (id: string) => void;
  statusText: string;
}) {
  const [q, setQ] = useState("");

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
        <div className="mb-3">
          <ListStatusLabels statusText={statusText} />
        </div>
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
        <Link
          href="/add"
          className={cn(
            buttonVariants({ size: "sm" }),
            "h-10 shrink-0 bg-orange-500 text-black hover:bg-orange-400",
          )}
        >
          <HousePlus className="size-3.5" />
          הוסיפו בית
        </Link>
      </div>
      <ListStatusLabels statusText={statusText} />
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-violet-300">אין בתים שמתאימים לחיפוש.</p>
      ) : (
        filtered.map(({ h, d }) => (
          <HouseCard
            key={h.id}
            house={h}
            distanceM={d}
            catalogSource={catalogSource}
            liked={likedIds?.includes(h.id)}
            onToggleLike={onToggleLike ? () => onToggleLike(h.id) : undefined}
            visited={visitedIds?.includes(h.id)}
            onToggleVisited={onToggleVisited ? () => onToggleVisited(h.id) : undefined}
            canEdit={Boolean(canEditHouse?.(h.id))}
            editCode={editCodeFor?.(h.id)}
            admin={admin}
            onUpdated={onHouseUpdated}
            onDeleted={onHouseDeleted}
            onShowOnMap={onShowOnMap ? () => onShowOnMap(h.id) : undefined}
          />
        ))
      )}
    </div>
  );
}
