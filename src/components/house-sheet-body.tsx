"use client";

import type { ReactNode } from "react";
import { HouseCard } from "@/components/house-card";
import { FilterMismatchNotice } from "@/components/house-skipped-banner";
import { CodesCopy } from "@/components/codes-copy";
import { houseHeadline } from "@/lib/labels";
import type { SkippedHouseMeta } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";

/** Shared map/list sheet house body — same card as the main list view. */
export function HouseSheetBody({
  house,
  editing,
  editCode,
  extra,
  filterMismatchReasons,
  skipMeta,
  onRestoreRoute,
  skipped,
  catalogSource,
  liked,
  onToggleLike,
  visited,
  onToggleVisited,
  gemCollected,
  index,
  hideHoursBanner,
  canEdit,
  onToggleEdit,
  onShowOnMap,
  onShowInList,
  onToggleGem,
  onSkip,
  admin,
}: {
  house: PublicHouse;
  editing?: boolean;
  editCode?: string;
  extra?: ReactNode;
  filterMismatchReasons?: string[];
  skipMeta?: SkippedHouseMeta;
  onRestoreRoute?: () => void;
  skipped?: boolean;
  catalogSource?: string | null;
  liked?: boolean;
  onToggleLike?: () => void;
  visited?: boolean;
  onToggleVisited?: () => void;
  gemCollected?: boolean;
  index?: number;
  hideHoursBanner?: boolean;
  canEdit?: boolean;
  onToggleEdit?: () => void;
  onShowOnMap?: () => void;
  onShowInList?: () => void;
  onToggleGem?: () => void;
  onSkip?: () => void;
  admin?: boolean;
}) {
  return (
    <>
      <FilterMismatchNotice
        reasons={filterMismatchReasons}
        skipMeta={skipMeta}
        onRestoreRoute={onRestoreRoute}
        hideSkipBanner
      />
      {editing ? (
        <>
          <p className="map-house-sheet-kicker">{houseHeadline(house)}</p>
          {editCode ? <CodesCopy editCode={editCode} /> : null}
          {extra}
        </>
      ) : (
        <HouseCard
          house={house}
          catalogSource={catalogSource}
          liked={liked}
          onToggleLike={onToggleLike}
          visited={visited}
          onToggleVisited={onToggleVisited}
          gemCollected={gemCollected}
          skipped={skipped}
          skipMeta={skipMeta}
          onRestoreRoute={onRestoreRoute}
          onSkip={onSkip}
          canEdit={canEdit}
          editCode={editCode}
          admin={admin}
          onShowOnMap={onShowOnMap}
          onShowInList={onShowInList}
          onToggleGem={onToggleGem}
          onToggleEdit={onToggleEdit}
          editing={editing}
          index={index}
          hideHoursBanner={hideHoursBanner}
          extra={extra}
          className="border-0 bg-transparent !shadow-none !ring-0"
        />
      )}
    </>
  );
}
