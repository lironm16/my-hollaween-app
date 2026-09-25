"use client";

import { Card } from "@/components/ui/card";
import { HouseActionBar } from "@/components/house-action-bar";
import { HouseDetails } from "@/components/house-details";
import { HouseCardBanners } from "@/components/house-skipped-banner";
import type { SkippedHouseMeta } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function HouseCard({
  house,
  distanceM,
  catalogSource,
  liked,
  onToggleLike,
  visited,
  onToggleVisited,
  gemCollected,
  onSkip,
  onRestoreRoute,
  skipped = false,
  skipMeta,
  canEdit = false,
  editCode,
  admin = false,
  onShowOnMap,
  onShowInList,
  onToggleGem,
  editing = false,
  onToggleEdit,
  expanded = false,
  index,
  hideHoursBanner = false,
  extra,
  className,
}: {
  house: PublicHouse;
  distanceM?: number;
  catalogSource?: string | null;
  liked?: boolean;
  onToggleLike?: () => void;
  visited?: boolean;
  onToggleVisited?: () => void;
  gemCollected?: boolean;
  onSkip?: () => void;
  onRestoreRoute?: () => void;
  skipped?: boolean;
  skipMeta?: SkippedHouseMeta;
  canEdit?: boolean;
  editCode?: string;
  admin?: boolean;
  onShowOnMap?: () => void;
  onShowInList?: () => void;
  onToggleGem?: () => void;
  editing?: boolean;
  onToggleEdit?: () => void;
  /** Show full details inline (non-compact list layout). */
  expanded?: boolean;
  index?: number;
  hideHoursBanner?: boolean;
  extra?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "house-list-card overflow-visible border-orange-500/15 bg-[#1d1028]/90 text-base !shadow-none !ring-0",
        className,
      )}
    >
      <div className="px-3 pb-1 pt-2">
        <HouseCardBanners
          skipped={skipped}
          skipMeta={skipMeta}
          visited={visited}
          onRestoreRoute={onRestoreRoute}
          onToggleVisited={onToggleVisited}
        />
        <HouseDetails
          house={house}
          distanceM={distanceM}
          catalogSource={catalogSource}
          liked={liked}
          onToggleLike={onToggleLike}
          visited={visited}
          onToggleVisited={onToggleVisited}
          gemCollected={gemCollected}
          chrome="sheet"
          compact={!expanded}
          index={index}
          hideHoursBanner={hideHoursBanner}
          extra={extra}
          headerMenu={
            <HouseActionBar
              house={house}
              liked={liked}
              visited={visited}
              onToggleLike={onToggleLike}
              onToggleVisited={onToggleVisited}
              onSkip={skipped ? undefined : onSkip}
              onRestoreRoute={skipped ? onRestoreRoute : undefined}
              skipped={skipped}
              onToggleEdit={canEdit ? onToggleEdit : undefined}
              editCode={editCode}
              onShowOnMap={onShowOnMap}
              onShowInList={onShowInList}
              onToggleGem={onToggleGem}
              editing={editing}
              menuPlacement="bottom"
            />
          }
        />
      </div>
    </Card>
  );
}
