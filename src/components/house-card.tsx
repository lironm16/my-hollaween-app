"use client";

import { Card } from "@/components/ui/card";
import { HouseActionBar } from "@/components/house-action-bar";
import { HouseDetails } from "@/components/house-details";
import { HouseSkippedBanner, HouseVisitedBanner } from "@/components/house-skipped-banner";
import type { SkippedHouseMeta } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HouseCard({
  house,
  distanceM,
  catalogSource,
  liked,
  onToggleLike,
  visited,
  onToggleVisited,
  onSkip,
  onRestoreRoute,
  skipped = false,
  skipMeta,
  canEdit = false,
  editCode,
  admin = false,
  onShowOnMap,
  editing = false,
  onToggleEdit,
  expanded = false,
  index,
}: {
  house: PublicHouse;
  distanceM?: number;
  catalogSource?: string | null;
  liked?: boolean;
  onToggleLike?: () => void;
  visited?: boolean;
  onToggleVisited?: () => void;
  onSkip?: () => void;
  onRestoreRoute?: () => void;
  skipped?: boolean;
  skipMeta?: SkippedHouseMeta;
  canEdit?: boolean;
  editCode?: string;
  admin?: boolean;
  onShowOnMap?: () => void;
  editing?: boolean;
  onToggleEdit?: () => void;
  /** Show full details inline (non-compact list layout). */
  expanded?: boolean;
  index?: number;
}) {
  return (
    <Card
      size="sm"
      className="house-list-card overflow-visible border-orange-500/15 bg-[#1d1028]/90 text-base !shadow-none !ring-0"
    >
      <div className="px-3 pb-1 pt-2">
        {skipped ? <HouseSkippedBanner meta={skipMeta} onRestore={onRestoreRoute} /> : null}
        {visited && !skipped ? <HouseVisitedBanner onRestore={onToggleVisited} /> : null}
        <HouseDetails
          house={house}
          distanceM={distanceM}
          catalogSource={catalogSource}
          liked={liked}
          onToggleLike={onToggleLike}
          visited={visited}
          onToggleVisited={onToggleVisited}
          chrome="sheet"
          compact={!expanded}
          index={index}
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
              editing={editing}
              menuPlacement="bottom"
            />
          }
        />
      </div>
    </Card>
  );
}
