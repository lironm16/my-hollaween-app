"use client";

import type { ReactNode } from "react";
import { HouseCard } from "@/components/house-card";
import { houseCardPropsFor, type HouseCardActionContext } from "@/components/house-card-actions";
import { useServerHouseDetail } from "@/hooks/use-server-house-detail";
import { FilterMismatchNotice } from "@/components/house-skipped-banner";
import { CodesCopy } from "@/components/codes-copy";
import { houseHeadline } from "@/lib/labels";
import type { SkippedHouseMeta } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";

/** Shared map/list sheet house body — same card + ⋮ menu as the main list view. */
export function HouseSheetBody({
  house,
  actionContext,
  editing,
  extra,
  filterMismatchReasons,
  skipMeta,
  onRestoreRoute,
  index,
  hideHoursBanner,
}: {
  house: PublicHouse;
  actionContext: HouseCardActionContext;
  editing?: boolean;
  extra?: ReactNode;
  filterMismatchReasons?: string[];
  skipMeta?: SkippedHouseMeta;
  onRestoreRoute?: () => void;
  index?: number;
  hideHoursBanner?: boolean;
}) {
  const editCode = actionContext.editCodeFor?.(house.id);
  const { house: liveHouse, loading, unavailable } = useServerHouseDetail(house);
  const displayHouse = liveHouse ?? house;
  return (
    <>
      {loading ? (
        <p className="mb-2 text-sm text-violet-300" role="status">
          טוען פרטי בית מהשרת…
        </p>
      ) : null}
      {unavailable ? (
        <p className="mb-2 text-sm text-orange-200" role="alert">
          הבית לא זמין במפה הציבורית.
        </p>
      ) : null}
      <FilterMismatchNotice
        reasons={filterMismatchReasons}
        skipMeta={skipMeta}
        onRestoreRoute={onRestoreRoute}
        hideSkipBanner
      />
      {editing ? (
        <>
          <p className="map-house-sheet-kicker">{houseHeadline(displayHouse)}</p>
          {editCode ? <CodesCopy editCode={editCode} /> : null}
          {extra}
        </>
      ) : (
        <HouseCard
          {...houseCardPropsFor(displayHouse, actionContext, {
            index,
            hideHoursBanner,
            extra,
            className: "border-0 bg-transparent !shadow-none !ring-0",
          })}
        />
      )}
    </>
  );
}
