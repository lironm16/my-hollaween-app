"use client";

import { Card } from "@/components/ui/card";
import { HouseDetails } from "@/components/house-details";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HouseCard({
  house,
  expanded,
  onToggle,
  distanceM,
  catalogSource,
  liked,
  onToggleLike,
  visited,
  onToggleVisited,
}: {
  house: PublicHouse;
  expanded?: boolean;
  onToggle?: () => void;
  distanceM?: number;
  catalogSource?: string | null;
  liked?: boolean;
  onToggleLike?: () => void;
  visited?: boolean;
  onToggleVisited?: () => void;
}) {
  return (
    <Card
      size="sm"
      aria-expanded={expanded}
      className={cn(
        "cursor-pointer border-orange-500/15 bg-[#1d1028]/90 text-base transition hover:border-orange-400/50 hover:bg-[#261536]",
      )}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button, a, input, label, textarea")) return;
        onToggle?.();
      }}
    >
      <div className="px-3 pb-1">
        <HouseDetails
          house={house}
          compact={!expanded}
          distanceM={distanceM}
          catalogSource={catalogSource}
          liked={liked}
          onToggleLike={onToggleLike}
          visited={visited}
          onToggleVisited={onToggleVisited}
        />
      </div>
    </Card>
  );
}
