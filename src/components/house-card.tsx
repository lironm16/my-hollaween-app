"use client";

import { CheckCircle2, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HouseTags } from "@/components/house-tags";
import { formatDisplayAddress } from "@/lib/config";
import { houseHeadline } from "@/lib/labels";
import { formatDistance } from "@/lib/geo";
import { effectiveVisit, isFrozen } from "@/lib/house-state";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HouseCard({
  house,
  onOpen,
  distanceM,
  liked,
  onToggleLike,
  visited,
  onToggleVisited,
}: {
  house: PublicHouse;
  onOpen?: () => void;
  distanceM?: number;
  liked?: boolean;
  onToggleLike?: () => void;
  visited?: boolean;
  onToggleVisited?: () => void;
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "cursor-pointer border-orange-500/15 bg-[#1d1028]/90 transition hover:border-orange-400/50 hover:bg-[#261536]",
        isFrozen(house) && "opacity-50",
      )}
      onClick={onOpen}
    >
      <CardHeader className="pb-1">
        <CardTitle className="flex items-start justify-between gap-2 text-orange-100">
          <span>{houseHeadline(house)}</span>
          <span className="flex items-center gap-0.5">
            {onToggleVisited ? (
              <button
                type="button"
                aria-label={visited ? "סמנו כלא ביקרתי" : "סמנו שביקרתי"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisited();
                }}
                className="rounded-full p-1 text-orange-200 hover:bg-orange-500/15"
              >
                <CheckCircle2
                  className={cn("size-5", visited && "fill-emerald-500/30 text-emerald-400")}
                />
              </button>
            ) : null}
            {onToggleLike ? (
              <button
                type="button"
                aria-label={liked ? "הסירו מהשמורים" : "שמרו את הבית"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike();
                }}
                className="rounded-full p-1 text-orange-200 hover:bg-orange-500/15"
              >
                <Heart className={cn("size-5", liked && "fill-orange-500 text-orange-500")} />
              </button>
            ) : null}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-violet-100/80">
        <p>{formatDisplayAddress(house)}</p>
        {house.arrival ? <p className="text-xs text-amber-200/90">{house.arrival}</p> : null}
        <p className="text-xs">
          {house.openFrom}–{house.openTo}
          {distanceM !== undefined ? ` · ${formatDistance(distanceM)}` : ""}
        </p>
        {effectiveVisit(house) === "closed" ? (
          <p className="text-sm font-semibold text-red-500">נגמר המלאי — אין סיבה לבוא עכשיו</p>
        ) : null}
        <HouseTags house={house} />
        {house.status === "pending" ? (
          <p className="text-xs font-medium text-amber-200">ממתין לאישור</p>
        ) : null}
        {isFrozen(house) ? (
          <p className="text-xs font-medium text-violet-300">מוקפא מהמפה הציבורית</p>
        ) : null}
        {visited ? (
          <p className="text-xs font-medium text-emerald-300">ביקרתם כאן</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
