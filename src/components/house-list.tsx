"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { HouseCard } from "@/components/house-card";
import { treatLabels } from "@/lib/labels";
import { TREAT_OPTIONS, type PublicHouse, type TreatId } from "@/lib/types";

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function HouseList({
  houses,
  onOpen,
  origin,
}: {
  houses: PublicHouse[];
  onOpen: (house: PublicHouse) => void;
  origin?: { lat: number; lng: number } | null;
}) {
  const [q, setQ] = useState("");
  const [treat, setTreat] = useState<TreatId | "all">("all");

  const filtered = useMemo(() => {
    const needle = q.trim();
    return houses
      .filter((h) => {
        const text = `${h.name} ${h.address} ${h.description} ${h.id} ${h.arrival ?? ""} ${h.theme ?? ""}`;
        const matchQ = !needle || text.includes(needle);
        const matchT = treat === "all" || h.treats.includes(treat);
        return matchQ && matchT;
      })
      .map((h) => ({
        h,
        d: origin ? haversine(origin, h) : undefined,
      }))
      .sort((a, b) => {
        if (a.h.soldOut !== b.h.soldOut) return a.h.soldOut ? 1 : -1;
        if (a.d !== undefined && b.d !== undefined) return a.d - b.d;
        return a.h.name.localeCompare(b.h.name, "he");
      });
  }, [houses, q, treat, origin]);

  if (houses.length === 0) {
    return (
      <div className="px-4 py-16 text-center text-violet-200">
        <p className="font-display text-2xl text-orange-300">עדיין אין בתים במפה</p>
        <p className="mt-2 text-sm">ברגע שמנהל יאשר בתים, הם יופיעו כאן וגם בלי רשת.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 py-3">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="חיפוש לפי שם, רחוב או מזהה…"
        className="h-10 bg-[#1d1028] text-base"
      />
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <FilterChip active={treat === "all"} onClick={() => setTreat("all")}>
          הכל
        </FilterChip>
        {TREAT_OPTIONS.map((id) => (
          <FilterChip key={id} active={treat === id} onClick={() => setTreat(id)}>
            {treatLabels[id]}
          </FilterChip>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-violet-300">אין בתים שמתאימים לסינון.</p>
      ) : (
        filtered.map(({ h, d }) => (
          <HouseCard key={h.id} house={h} distanceM={d} onOpen={() => onOpen(h)} />
        ))
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "shrink-0 rounded-full bg-orange-500 px-3 py-1 text-xs font-medium text-black"
          : "shrink-0 rounded-full bg-[#1d1028] px-3 py-1 text-xs text-orange-100 ring-1 ring-orange-500/25"
      }
    >
      {children}
    </button>
  );
}
