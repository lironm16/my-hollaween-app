"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { HousePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { HouseCard } from "@/components/house-card";
import { distanceMeters } from "@/lib/geo";
import { effectiveVisit } from "@/lib/house-state";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    const overflowY = getComputedStyle(node).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return null;
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
  onlineDevices = null,
  canEditHouse,
  editCodeFor,
  onHouseUpdated,
  onHouseDeleted,
  setLabel,
}: {
  houses: PublicHouse[];
  origin?: { lat: number; lng: number } | null;
  catalogSource?: string | null;
  likedIds?: string[];
  onToggleLike?: (id: string) => void;
  visitedIds?: string[];
  onToggleVisited?: (id: string) => void;
  admin?: boolean;
  onlineDevices?: number | null;
  canEditHouse?: (id: string) => boolean;
  editCodeFor?: (id: string) => string | undefined;
  onHouseUpdated?: (house: PublicHouse) => void;
  onHouseDeleted?: (id: string) => void;
  setLabel?: string;
}) {
  const [q, setQ] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const cardEls = useRef(new Map<string, HTMLElement>());
  const collapseAnchor = useRef<{ id: string; scroller: HTMLElement } | null>(null);

  useLayoutEffect(() => {
    const pending = collapseAnchor.current;
    collapseAnchor.current = null;
    if (!pending) return;
    const card = cardEls.current.get(pending.id);
    if (!card) return;
    const scrollerBox = pending.scroller.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    if (cardBox.top < scrollerBox.top + 8) {
      pending.scroller.scrollTop += cardBox.top - scrollerBox.top - 8;
    } else if (cardBox.bottom > scrollerBox.bottom - 8) {
      pending.scroller.scrollTop += cardBox.bottom - scrollerBox.bottom + 8;
    }
  }, [expandedId]);

  function onToggle(id: string) {
    setExpandedId((current) => {
      if (current === id) {
        const card = cardEls.current.get(id);
        const scroller = scrollParent(card ?? null);
        collapseAnchor.current = scroller ? { id, scroller } : null;
        return null;
      }
      collapseAnchor.current = null;
      return id;
    });
  }

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
        {setLabel ? <p className="mb-3 text-base text-violet-300">{setLabel}</p> : null}
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
      <p className="text-base text-violet-300">
        {houses.length} בתים
        {onlineDevices != null ? ` · ${onlineDevices} מבקרים` : ""}
        {" · מיון לפי מרחק"}
        {setLabel ? ` · ${setLabel}` : ""}
      </p>
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-violet-300">אין בתים שמתאימים לחיפוש.</p>
      ) : (
        filtered.map(({ h, d }) => (
          <div
            key={h.id}
            ref={(node) => {
              if (node) cardEls.current.set(h.id, node);
              else cardEls.current.delete(h.id);
            }}
          >
            <HouseCard
              house={h}
              distanceM={d}
              catalogSource={catalogSource}
              expanded={expandedId === h.id}
              onToggle={() => onToggle(h.id)}
              liked={likedIds?.includes(h.id)}
              onToggleLike={onToggleLike ? () => onToggleLike(h.id) : undefined}
              visited={visitedIds?.includes(h.id)}
              onToggleVisited={onToggleVisited ? () => onToggleVisited(h.id) : undefined}
              canEdit={Boolean(canEditHouse?.(h.id))}
              editCode={editCodeFor?.(h.id)}
              admin={admin}
              onUpdated={onHouseUpdated}
              onDeleted={onHouseDeleted}
            />
          </div>
        ))
      )}
    </div>
  );
}
