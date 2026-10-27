"use client";

import { HouseCardQuickActions } from "@/components/house-card-quick-actions";
import { useAddressReveal } from "@/hooks/use-address-reveal";
import { GEM_CLUSTER_FIND_ALL_HE, GEM_CLUSTER_FOUND_ALL_HE } from "@/lib/gem-hunt-copy";
import { clusterIsSchoolCampus } from "@/lib/school-campus";
import type { PublicHouse } from "@/lib/types";
import { useLocale } from "@/hooks/use-locale";
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
  const { t } = useLocale();
  const addressReveal = useAddressReveal();
  const readGemCollected = gemCollected ?? (() => false);
  const allVisited = houses.length > 0 && houses.every((house) => visited(house.id));
  const allSkipped = houses.length > 0 && houses.every((house) => skipped(house.id));
  const allLiked = houses.length > 0 && houses.every((house) => liked(house.id));
  const gemHouses = houses.filter((house) => addressReveal.canViewDetails(house.id));
  const allGemsCollected =
    gemHouses.length >= 2 && gemHouses.every((house) => readGemCollected(house.id));
  const showGemActions =
    gemHouses.length >= 2 && Boolean(onFindAllGems || onResetAllGems);

  if ((houses.length <= 1 && !clusterIsSchoolCampus(houses)) || houses.length === 0) {
    return null;
  }

  return (
    <HouseCardQuickActions
      className={cn("shrink-0", className)}
      toolbarAriaLabel={t("clusterActions.toolbarAria")}
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
      visitedAriaLabel={allVisited ? t("clusterActions.unvisitAll") : t("clusterActions.visitAll")}
      likeAriaLabel={allLiked ? t("clusterActions.unlikeAll") : t("clusterActions.likeAll")}
      skipAriaLabel={allSkipped ? t("clusterActions.unskipAll") : t("clusterActions.skipAll")}
      gemAriaLabel={
        allGemsCollected ? GEM_CLUSTER_FOUND_ALL_HE : GEM_CLUSTER_FIND_ALL_HE
      }
    />
  );
}
