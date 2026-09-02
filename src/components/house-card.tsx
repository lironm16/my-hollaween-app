"use client";

import { Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HouseTags } from "@/components/house-tags";
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
}: {
  house: PublicHouse;
  onOpen?: () => void;
  distanceM?: number;
  liked?: boolean;
  onToggleLike?: () => void;
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "cursor-pointer border-orange-500/15 bg-[#1d1028]/90 transition hover:border-orange-400/50 hover:bg-[#261536]",
        house.soldOut && "opacity-70",
        effectiveVisit(house) === "closed" && "opacity-70",
        isFrozen(house) && "opacity-50",
      )}
      onClick={onOpen}
    >
      <CardHeader className="pb-1">
        <CardTitle className="flex items-start justify-between gap-2 text-orange-100">
          <span>{houseHeadline(house)}</span>
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
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-violet-100/80">
        <p>{house.address}</p>
        {house.arrival ? <p className="text-xs text-amber-200/90">{house.arrival}</p> : null}
        <p className="text-xs">
          {house.openFrom}–{house.openTo}
          {distanceM !== undefined ? ` · ${formatDistance(distanceM)}` : ""}
        </p>
        <HouseTags house={house} />
      </CardContent>
    </Card>
  );
}
