"use client";

import { Card } from "@/components/ui/card";
import { HouseActionBar } from "@/components/house-action-bar";
import { HouseCardQuickActions } from "@/components/house-card-quick-actions";
import { houseActionBarPropsFromCard, houseQuickActionPropsFromCard } from "@/components/house-card-actions";
import { useCatalogRemoved } from "@/hooks/use-catalog-removed";
import { deviceHouseEditAllowed } from "@/lib/catalog-removed";
import { HouseDetails } from "@/components/house-details";
import { HoursStatusBanner } from "@/components/hours-status-banner";
import { SkipReturnSection } from "@/components/skip-return-section";
import type { TemporaryRestoreTriggerId } from "@/lib/skip-reasons";
import type { SkippedHouseMeta } from "@/lib/offline-db";
import { useAdminHouseFields } from "@/hooks/use-admin-house-fields";
import { useServerHouseDetail } from "@/hooks/use-server-house-detail";
import { houseNeedsLocationHydration, isDeviceCachePinHouse } from "@/lib/device-catalog-cache";
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
  onSaveSkipRestore,
  onClearSkipRestore,
  canEdit = false,
  editCode,
  showVisitPoster = false,
  admin = false,
  onShowOnMap,
  onShowInList,
  onToggleGem,
  editing = false,
  onToggleEdit,
  onNightPasses,
  onPlaceGem,
  expanded = false,
  index,
  hideHoursBanner = false,
  extra,
  className,
  /** Fetch address/story fields when the row is pin-only from device cache. */
  liveDetail = false,
  clusterBoothTag,
  /** Parent already shows the server loading/unavailable status. */
  hideLiveStatus = false,
  ...rest
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
  onSaveSkipRestore?: (triggers: TemporaryRestoreTriggerId[]) => void;
  onClearSkipRestore?: () => void;
  canEdit?: boolean;
  editCode?: string;
  showVisitPoster?: boolean;
  admin?: boolean;
  onShowOnMap?: () => void;
  onShowInList?: () => void;
  onToggleGem?: () => void;
  editing?: boolean;
  onToggleEdit?: () => void;
  onNightPasses?: () => void;
  onPlaceGem?: () => void;
  /** Show full details inline (non-compact list layout). */
  expanded?: boolean;
  index?: number;
  hideHoursBanner?: boolean;
  extra?: ReactNode;
  className?: string;
  liveDetail?: boolean;
  clusterBoothTag?: string | null;
  hideLiveStatus?: boolean;
}) {
  const catalogRemoved = useCatalogRemoved(house.id);
  const mayEdit = canEdit && deviceHouseEditAllowed(house.id);
  const overlaid = useAdminHouseFields(house) ?? house;
  const shouldFetchLive =
    (liveDetail && isDeviceCachePinHouse(overlaid)) || houseNeedsLocationHydration(overlaid);
  const { house: liveHouse, loading, unavailable } = useServerHouseDetail(
    shouldFetchLive ? overlaid : null,
  );
  const hydrated = useAdminHouseFields(liveHouse) ?? liveHouse;
  const displayHouse = shouldFetchLive ? (hydrated ?? overlaid) : overlaid;
  const cardProps = {
    house: displayHouse,
    distanceM,
    catalogSource,
    liked,
    onToggleLike,
    visited,
    onToggleVisited,
    gemCollected,
    onSkip,
    onRestoreRoute,
    skipped,
    skipMeta,
    onSaveSkipRestore,
    onClearSkipRestore,
    canEdit: mayEdit,
    editCode: mayEdit ? editCode : undefined,
    showVisitPoster: mayEdit && showVisitPoster,
    admin,
    onShowOnMap,
    onShowInList,
    onToggleGem,
    editing: mayEdit && editing,
    onToggleEdit: mayEdit ? onToggleEdit : undefined,
    onNightPasses: mayEdit ? onNightPasses : undefined,
    onPlaceGem: mayEdit ? onPlaceGem : undefined,
    expanded,
    index,
    hideHoursBanner,
    extra,
    className,
    liveDetail,
    ...rest,
  };
  return (
    <Card
      size="sm"
      className={cn(
        "house-list-card overflow-visible border-orange-500/15 bg-[#1d1028]/90 text-base !shadow-none !ring-0",
        className,
      )}
    >
      <div className="px-3 pb-1 pt-2">
        {shouldFetchLive && loading && !hideLiveStatus ? (
          <p className="mb-2 text-sm text-violet-300" role="status">
            טוען פרטי בית מהשרת…
          </p>
        ) : null}
        {shouldFetchLive && unavailable && !hideLiveStatus ? (
          <p className="mb-2 text-sm text-orange-200" role="alert">
            הבית לא זמין במפה הציבורית.
          </p>
        ) : null}
        <div
          className={cn(
            "house-card-top-bar mb-2 flex min-w-0 items-center gap-2",
            catalogRemoved && "justify-between",
          )}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {catalogRemoved ? (
            <HoursStatusBanner house={displayHouse} className="mb-0 shrink min-w-0" />
          ) : (
            <HouseCardQuickActions {...houseQuickActionPropsFromCard(cardProps)} className="min-w-0 flex-1" />
          )}
          <HouseActionBar
            {...houseActionBarPropsFromCard(cardProps)}
            className={cn(catalogRemoved && "shrink-0 self-center")}
          />
        </div>
        {skipped && skipMeta && onSaveSkipRestore && onClearSkipRestore ? (
          <SkipReturnSection
            house={displayHouse}
            meta={skipMeta}
            onSave={onSaveSkipRestore}
            onClear={onClearSkipRestore}
          />
        ) : null}
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
          hideHoursBanner={hideHoursBanner || catalogRemoved}
          clusterBoothTag={clusterBoothTag}
          extra={extra}
          canEdit={mayEdit}
          onToggleEdit={mayEdit ? onToggleEdit : undefined}
        />
      </div>
    </Card>
  );
}
