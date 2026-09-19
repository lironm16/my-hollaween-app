"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HouseActionBar } from "@/components/house-action-bar";
import { OverlayCloseBar } from "@/components/overlay-close-button";
import { HouseDetails } from "@/components/house-details";
import { FilterMismatchNotice } from "@/components/house-skipped-banner";
import { CodesCopy } from "@/components/codes-copy";
import {
  ClusterHouseList,
  ClusterHouseNav,
  ClusterHouseSwipeArea,
  clusterHouseIndex,
} from "@/components/cluster-house-list";
import { formatDisplayAddress } from "@/lib/config";
import { houseHeadline } from "@/lib/labels";
import type { SkippedHouseMeta } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HouseDetailOverlay({
  house,
  onClose,
  liked,
  onToggleLike,
  visited,
  onToggleVisited,
  extra,
  catalogSource,
  managerEditCode,
  editCodeFor,
  canEditHouse,
  editing,
  onToggleEdit,
  onShowOnMap,
  onShowInList,
  onSkip,
  onRestoreRoute,
  skipped,
  skipMeta,
  filterMismatchReasons,
  clusterOverview,
  openedFromList = false,
  clusterHouses,
  onSelectClusterHouse,
  onAdjacentClusterHouse,
  onBackToClusterOverview,
  now,
  skippedIds,
  filteredOutIds,
  index,
}: {
  house: PublicHouse;
  onClose: () => void;
  liked?: (id: string) => boolean;
  onToggleLike?: (id: string) => void;
  visited?: (id: string) => boolean;
  onToggleVisited?: (id: string) => void;
  extra?: ReactNode;
  catalogSource?: string | null;
  managerEditCode?: string;
  editCodeFor?: (id: string) => string | undefined;
  canEditHouse?: (id: string) => boolean;
  editing?: boolean;
  onToggleEdit?: () => void;
  onShowOnMap?: () => void;
  onShowInList?: () => void;
  onSkip?: () => void;
  onRestoreRoute?: () => void;
  skipped?: boolean;
  skipMeta?: SkippedHouseMeta;
  filterMismatchReasons?: string[];
  clusterOverview?: boolean;
  /** Opened from the flat list — show one house, not map cluster chrome. */
  openedFromList?: boolean;
  clusterHouses?: PublicHouse[];
  onSelectClusterHouse?: (id: string) => void;
  onAdjacentClusterHouse?: (delta: -1 | 1) => void;
  onBackToClusterOverview?: () => void;
  now?: Date;
  skippedIds?: (id: string) => boolean;
  filteredOutIds?: (id: string) => boolean;
  index?: number;
}) {
  const labelId = useId();
  const canEditSelected = Boolean(canEditHouse?.(house.id) && onToggleEdit);
  const multi = !openedFromList && (clusterHouses?.length ?? 0) > 1;
  const overview = Boolean(multi && clusterOverview);
  const clusterIndex = clusterHouses ? clusterHouseIndex(clusterHouses, house.id) : null;
  const canPrevCluster = clusterIndex != null && clusterIndex > 1;
  const canNextCluster =
    clusterIndex != null && clusterHouses != null && clusterIndex < clusterHouses.length;
  const clusterNow = now ?? new Date();
  const isSkipped = skippedIds ?? (() => false);
  const isFilteredOut = filteredOutIds ?? (() => false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [house.id]);

  const overlay = (
    <div
      className="house-detail-overlay fixed inset-0 z-[60] flex flex-col bg-[#160b20]"
      role="dialog"
      aria-labelledby={labelId}
      tabIndex={-1}
      dir="rtl"
    >
      <div className="house-detail-overlay-top shrink-0">
        <OverlayCloseBar
          onClose={onClose}
          className="pb-1"
          trailing={
            <HouseActionBar
              house={house}
              liked={liked?.(house.id)}
              visited={visited?.(house.id)}
              onToggleLike={onToggleLike ? () => onToggleLike(house.id) : undefined}
              onToggleVisited={onToggleVisited ? () => onToggleVisited(house.id) : undefined}
              onToggleEdit={canEditSelected ? () => onToggleEdit?.() : undefined}
              onShowOnMap={onShowOnMap}
              onShowInList={onShowInList}
              onSkip={onSkip}
              onRestoreRoute={onRestoreRoute}
              skipped={skipped}
              editing={editing}
              menuPlacement="bottom"
            />
          }
        />
      </div>
      <div
        className={cn(
          "house-detail-overlay-body min-h-0 flex-1 px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]",
          multi && !overview
            ? "flex flex-col overflow-hidden"
            : "overflow-y-auto overscroll-contain",
        )}
      >
        {overview ? (
          <div id={labelId}>
            <p className="map-house-sheet-kicker">{formatDisplayAddress(house)}</p>
            <p className="map-house-sheet-sub mb-4">{clusterHouses!.length} בתים בכתובת זו</p>
            <div className="max-h-[min(52dvh,28rem)] overflow-y-auto overscroll-contain pe-0.5">
              <ClusterHouseList
                houses={clusterHouses!}
                selectedId={house.id}
                now={clusterNow}
                skipped={isSkipped}
                filteredOut={isFilteredOut}
                visited={visited}
                onSelect={(id) => onSelectClusterHouse?.(id)}
              />
            </div>
          </div>
        ) : multi ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {clusterIndex != null ? (
              <div className="shrink-0 pb-2">
                <ClusterHouseNav
                  houses={clusterHouses!}
                  selectedId={house.id}
                  onPrev={() => onAdjacentClusterHouse?.(-1)}
                  onNext={() => onAdjacentClusterHouse?.(1)}
                  onBack={() => onBackToClusterOverview?.()}
                />
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <ClusterHouseSwipeArea
                canPrev={canPrevCluster}
                canNext={canNextCluster}
                onPrev={() => onAdjacentClusterHouse?.(-1)}
                onNext={() => onAdjacentClusterHouse?.(1)}
              >
                <span id={labelId} className="sr-only">
                  {houseHeadline(house)}
                </span>
                <FilterMismatchNotice
                  reasons={filterMismatchReasons}
                  skipMeta={skipMeta}
                  onRestoreRoute={onRestoreRoute}
                />
                {editing ? (
                  <>
                    <p className="map-house-sheet-kicker">{houseHeadline(house)}</p>
                    <CodesCopy editCode={editCodeFor?.(house.id) ?? managerEditCode} />
                    {extra}
                  </>
                ) : (
                  <HouseDetails
                    house={house}
                    catalogSource={catalogSource}
                    liked={liked?.(house.id)}
                    onToggleLike={onToggleLike ? () => onToggleLike(house.id) : undefined}
                    visited={visited?.(house.id)}
                    onToggleVisited={onToggleVisited ? () => onToggleVisited(house.id) : undefined}
                    extra={extra}
                    chrome="sheet"
                    index={index}
                  />
                )}
              </ClusterHouseSwipeArea>
            </div>
          </div>
        ) : (
          <ClusterHouseSwipeArea
            canPrev={canPrevCluster}
            canNext={canNextCluster}
            onPrev={() => onAdjacentClusterHouse?.(-1)}
            onNext={() => onAdjacentClusterHouse?.(1)}
          >
            <span id={labelId} className="sr-only">
              {houseHeadline(house)}
            </span>
            <FilterMismatchNotice
              reasons={filterMismatchReasons}
              skipMeta={skipMeta}
              onRestoreRoute={onRestoreRoute}
            />
            {editing ? (
              <>
                <p className="map-house-sheet-kicker">{houseHeadline(house)}</p>
                <CodesCopy editCode={editCodeFor?.(house.id) ?? managerEditCode} />
                {extra}
              </>
            ) : (
              <HouseDetails
                house={house}
                catalogSource={catalogSource}
                liked={liked?.(house.id)}
                onToggleLike={onToggleLike ? () => onToggleLike(house.id) : undefined}
                visited={visited?.(house.id)}
                onToggleVisited={onToggleVisited ? () => onToggleVisited(house.id) : undefined}
                extra={extra}
                chrome="sheet"
                index={index}
              />
            )}
          </ClusterHouseSwipeArea>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}
