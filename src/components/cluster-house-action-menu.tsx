"use client";

import { HouseCardQuickActions } from "@/components/house-card-quick-actions";
import { GEM_CLUSTER_FIND_ALL_HE, GEM_CLUSTER_FOUND_ALL_HE } from "@/lib/gem-hunt-copy";
import { clusterIsSchoolCampus } from "@/lib/school-campus";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Icon-only cluster actions — same controls as a house card, applied to every unit at the address. */
export function ClusterHouseActionMenu({
  houses,
  liked,
  visited,
  skipped,
  onVisitAll,
  onUnvisitAll,
  onSkipAll,
  onRestoreAll,
  onLikeAll,
  onUnlikeAll,
  gemCollected,
  onFindAllGems,
  onResetAllGems,
  className,
}: {
  houses: PublicHouse[];
  liked: (id: string) => boolean;
  visited: (id: string) => boolean;
  skipped: (id: string) => boolean;
  onVisitAll?: () => void;
  onUnvisitAll?: () => void;
  onSkipAll?: () => void;
  onRestoreAll?: () => void;
  onLikeAll?: () => void;
  onUnlikeAll?: () => void;
  gemCollected?: (id: string) => boolean;
  onFindAllGems?: () => void;
  onResetAllGems?: () => void;
  menuPlacement?: "top" | "bottom";
  className?: string;
}) {
  const readGemCollected = gemCollected ?? (() => false);
  const allVisited = houses.length > 0 && houses.every((house) => visited(house.id));
  const allSkipped = houses.length > 0 && houses.every((house) => skipped(house.id));
  const allLiked = houses.length > 0 && houses.every((house) => liked(house.id));
  const allGemsCollected =
    houses.length >= 2 && houses.every((house) => readGemCollected(house.id));
  const showGemActions =
    houses.length >= 2 && Boolean(onFindAllGems || onResetAllGems);

  if ((houses.length <= 1 && !clusterIsSchoolCampus(houses)) || houses.length === 0) {
    return null;
  }

  return (
    <HouseCardQuickActions
      className={cn("shrink-0", className)}
      toolbarAriaLabel="פעולות על כל הבתים בכתובת"
      visited={allVisited}
      liked={allLiked}
      skipped={allSkipped}
      gemCollected={showGemActions ? allGemsCollected : undefined}
      onToggleVisited={
        onVisitAll || onUnvisitAll
          ? () => (allVisited ? onUnvisitAll?.() : onVisitAll?.())
          : undefined
      }
      onToggleLike={
        onLikeAll || onUnlikeAll
          ? () => (allLiked ? onUnlikeAll?.() : onLikeAll?.())
          : undefined
      }
      onSkip={allSkipped ? undefined : onSkipAll}
      onRestoreRoute={allSkipped ? onRestoreAll : undefined}
      onToggleGem={
        showGemActions
          ? () => (allGemsCollected ? onResetAllGems?.() : onFindAllGems?.())
          : undefined
      }
      visitedAriaLabel={allVisited ? "ביטול ביקור לכל הבתים" : "ביקרתי בכל הבתים"}
      likeAriaLabel={allLiked ? "הסירו אהבתי מכל הבתים" : "אהבתי את כל הבתים"}
      skipAriaLabel={allSkipped ? "החזרה — ביטול דילוג על הכל" : "דילוג על כל הבתים"}
      gemAriaLabel={
        allGemsCollected ? GEM_CLUSTER_FOUND_ALL_HE : GEM_CLUSTER_FIND_ALL_HE
      }
    />
  );
}
