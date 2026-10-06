"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ClusterHouseActionMenu } from "@/components/cluster-house-action-menu";
import { HouseCardActionMenu } from "@/components/house-card-action-menu";
import type { HouseCardActionContext } from "@/components/house-card-actions";
import { OverlayCloseBar } from "@/components/overlay-close-button";
import { HouseSheetBody } from "@/components/house-sheet-body";
import {
  ClusterHouseList,
  ClusterHouseNav,
  ClusterHouseSwipeArea,
  clusterHouseIndex,
} from "@/components/cluster-house-list";
import { useAddressReveal } from "@/hooks/use-address-reveal";
import { houseHeadline } from "@/lib/labels";
import { clusterBoothLabel } from "@/lib/cluster-booth";
import { HouseSkippedBanner, HouseVisitedBanner } from "@/components/house-skipped-banner";
import { clusterOverviewSubtitle, usesSchoolCampusClusterChrome } from "@/lib/school-campus";
import type { SkippedHouseMeta } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HouseDetailOverlay({
  house,
  actionContext,
  onClose,
  extra,
  editing,
  onRestoreRoute,
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
  liked,
  visited,
  gemCollected,
  index,
}: {
  house: PublicHouse;
  actionContext: HouseCardActionContext;
  onClose: () => void;
  extra?: ReactNode;
  editing?: boolean;
  onRestoreRoute?: () => void;
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
  liked?: (id: string) => boolean;
  visited?: (id: string) => boolean;
  gemCollected?: (id: string) => boolean;
  index?: number;
}) {
  const labelId = useId();
  const multi = !openedFromList && (clusterHouses?.length ?? 0) > 1;
  const clusterShell =
    !openedFromList &&
    ((clusterHouses?.length ?? 0) > 1 ||
      usesSchoolCampusClusterChrome(clusterHouses ?? []));
  const overview = Boolean(clusterShell && clusterOverview);
  const clusterIndex = clusterHouses ? clusterHouseIndex(clusterHouses, house.id) : null;
  const canPrevCluster = clusterIndex != null && clusterIndex > 1;
  const canNextCluster =
    clusterIndex != null && clusterHouses != null && clusterIndex < clusterHouses.length;
  const clusterNow = now ?? new Date();
  const addressReveal = useAddressReveal();
  const isSkipped = skippedIds ?? (() => false);
  const isFilteredOut = filteredOutIds ?? (() => false);
  const clusterAllSkipped =
    overview &&
    (clusterHouses?.length ?? 0) > 0 &&
    clusterHouses!.every((item) => isSkipped(item.id));
  const clusterAllVisited =
    overview &&
    (clusterHouses?.length ?? 0) > 0 &&
    clusterHouses!.every((item) => visited?.(item.id)) &&
    !clusterAllSkipped;
  const actionMenu = <HouseCardActionMenu house={house} actionContext={actionContext} />;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [house.id]);

  const clusterBoothTag =
    clusterShell && (clusterHouses?.length ?? 0) > 1
      ? clusterBoothLabel(house, clusterHouses!)
      : null;

  const sheetBody = (
    <HouseSheetBody
      house={house}
      actionContext={actionContext}
      editing={editing}
      extra={extra}
      filterMismatchReasons={filterMismatchReasons}
      skipMeta={skipMeta}
      onRestoreRoute={onRestoreRoute}
      index={index}
      clusterBoothTag={clusterBoothTag}
    />
  );

  const overlay = (
    <div
      className="house-detail-overlay fixed inset-0 z-[60] flex flex-col bg-[#160b20]"
      role="dialog"
      aria-labelledby={labelId}
      tabIndex={-1}
      dir="rtl"
    >
      <div className="house-detail-overlay-top shrink-0">
        <OverlayCloseBar onClose={onClose} className="pb-1" />
      </div>
      <div
        className={cn(
          "house-detail-overlay-body min-h-0 flex-1 px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]",
          clusterShell && !overview
            ? "flex flex-col overflow-hidden"
            : "overflow-y-auto overscroll-contain",
        )}
      >
        {overview ? (
          <div id={labelId}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="map-house-sheet-kicker">{addressReveal.formatDisplayAddress(house)}</p>
                <p className="map-house-sheet-sub">{clusterOverviewSubtitle(clusterHouses!)}</p>
              </div>
              <ClusterHouseActionMenu
                houses={clusterHouses!}
                liked={liked ?? (() => false)}
                visited={visited ?? (() => false)}
                skipped={skippedIds ?? (() => false)}
                onVisitAll={
                  actionContext.onClusterVisitAll
                    ? () => actionContext.onClusterVisitAll!(clusterHouses!)
                    : undefined
                }
                onUnvisitAll={
                  actionContext.onClusterUnvisitAll
                    ? () => actionContext.onClusterUnvisitAll!(clusterHouses!)
                    : undefined
                }
                onSkipAll={
                  actionContext.onClusterSkipAll
                    ? () => actionContext.onClusterSkipAll!(clusterHouses!)
                    : undefined
                }
                onRestoreAll={
                  actionContext.onClusterRestoreAll
                    ? () => actionContext.onClusterRestoreAll!(clusterHouses!)
                    : undefined
                }
                onLikeAll={
                  actionContext.onClusterLikeAll
                    ? () => actionContext.onClusterLikeAll!(clusterHouses!)
                    : undefined
                }
                onUnlikeAll={
                  actionContext.onClusterUnlikeAll
                    ? () => actionContext.onClusterUnlikeAll!(clusterHouses!)
                    : undefined
                }
              />
            </div>
            {clusterAllSkipped && actionContext.onClusterRestoreAll ? (
              <HouseSkippedBanner
                onRestore={() => actionContext.onClusterRestoreAll!(clusterHouses!)}
              />
            ) : null}
            {clusterAllVisited && actionContext.onClusterUnvisitAll ? (
              <HouseVisitedBanner
                onRestore={() => actionContext.onClusterUnvisitAll!(clusterHouses!)}
              />
            ) : null}
            <div className="max-h-[min(52dvh,28rem)] overflow-y-auto overscroll-contain pe-0.5">
              <ClusterHouseList
                houses={clusterHouses!}
                selectedId={house.id}
                now={clusterNow}
                skipped={isSkipped}
                filteredOut={isFilteredOut}
                visited={visited}
                gemCollected={gemCollected}
                liked={liked}
                onSelect={(id) => onSelectClusterHouse?.(id)}
              />
            </div>
          </div>
        ) : clusterShell ? (
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
                {sheetBody}
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
            {sheetBody}
          </ClusterHouseSwipeArea>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}
