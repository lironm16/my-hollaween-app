"use client";

import { ArrowRight } from "lucide-react";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function clusterHouseIndex(houses: PublicHouse[], houseId: string) {
  const index = houses.findIndex((item) => item.id === houseId);
  return index >= 0 ? index + 1 : null;
}

export function ClusterHouseList({
  houses,
  selectedId,
  onSelect,
}: {
  houses: PublicHouse[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {houses.map((item, index) => (
        <li key={item.id}>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start text-base ring-1 transition-colors",
              item.id === selectedId
                ? "bg-[#261536] text-orange-50 ring-orange-400/50"
                : "bg-[#1d1028] text-orange-50 ring-orange-500/25 hover:bg-[#261536]",
            )}
            onClick={() => onSelect(item.id)}
          >
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-sm font-semibold text-orange-200 tabular-nums"
              aria-hidden
            >
              {index + 1}
            </span>
            <span className="min-w-0">{houseHeadline(item)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

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
