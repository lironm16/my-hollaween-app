"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { buttonVariants } from "@/components/ui/button";
import { formatDisplayAddress } from "@/lib/config";
import { houseSharePath } from "@/lib/nav-links";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AdminGemHousePeek({
  house,
  petNameHe,
  distanceM,
  onClose,
}: {
  house: PublicHouse;
  petNameHe: string;
  distanceM?: number;
  onClose: () => void;
}) {
  return (
    <div className="admin-gem-house-peek overflow-hidden rounded-xl bg-[#12081a] ring-1 ring-orange-500/35">
      <div className="relative z-0 h-36 overflow-hidden sm:h-40">
        <HouseMapDynamic houses={[house]} selectedId={house.id} embed />
      </div>
      <div className="space-y-2 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg text-orange-200">{houseHeadline(house)}</p>
            <p className="text-sm text-violet-300">{petNameHe}</p>
            <p className="text-sm text-violet-400">{formatDisplayAddress(house)}</p>
            {distanceM != null ? (
              <p className="text-sm tabular-nums text-emerald-300/90">
                ~{Math.round(distanceM)} מ׳ מהמיקום שלכם
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="סגירה"
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-violet-300 hover:bg-violet-500/15"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={houseSharePath(house)}
            className={cn(buttonVariants({ size: "sm" }), "bg-orange-500 text-black hover:bg-orange-400")}
          >
            דף הבית (מפה + פרטים)
          </Link>
          <Link
            href={`/?focus=${encodeURIComponent(house.id)}`}
            className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "text-violet-200")}
          >
            במפה הראשית
          </Link>
        </div>
      </div>
    </div>
  );
}
