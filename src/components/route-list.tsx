"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, MapPin, Navigation } from "lucide-react";
import { HouseCard } from "@/components/house-card";
import { houseCardPropsFor, type HouseCardActionContext } from "@/components/house-card-actions";
import { useAddressReveal } from "@/hooks/use-address-reveal";
import { houseHeadline } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import type { PublicHouse } from "@/lib/types";
import { skipReturnActivePreviewLine } from "@/lib/skip-return-preview";
import { SkipSign } from "@/components/visit-marks";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";
import type { TourLegTone } from "@/lib/route-session-progress";

export type RouteListItem = {
  house: PublicHouse;
  order: number;
  hop: string;
  skipped: boolean;
  doneCollapsed?: boolean;
  legDone?: boolean;
  legSkipped?: boolean;
  legTone?: TourLegTone;
  distanceM?: number;
};

function RouteLeg({ label }: { label?: string }) {
  return (
    <div className={cn("route-list-leg", !label && "route-list-leg--line-only")}>
      <span className="route-list-leg-line" aria-hidden="true" />
      {label ? <span className="route-list-leg-label">{label}</span> : null}
    </div>
  );
}

function houseFrameClass(tone: TourLegTone, skipped: boolean, doneCollapsed: boolean) {
  if (doneCollapsed) return skipped ? "route-list-house--skipped" : "route-list-house--done";
  switch (tone) {
    case "visited":
      return "route-list-house--done";
    case "skipped":
      return "route-list-house--skipped";
    case "open-idle":
      return "route-list-house--idle";
    default:
      return "";
  }
}

function RouteListCollapsedHouse({
  house,
  order,
  actionContext,
  skipped,
  skipPreview,
  expanded,
  onToggle,
}: {
  house: PublicHouse;
  order: number;
  actionContext: HouseCardActionContext;
  skipped: boolean;
  skipPreview?: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const barProps = houseCardPropsFor(house, actionContext, { index: order > 0 ? order : undefined });
  return (
    <div
      className={cn(
        "route-list-house route-list-house--collapsed",
        skipped && "route-list-house--skipped",
        !skipped && "route-list-house--done",
      )}
    >
      <button
        type="button"
        className="route-list-collapsed-trigger"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        {order > 0 ? (
          <span className="route-list-collapsed-order" aria-hidden="true">
            {order}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 text-right">
          <span className="route-list-collapsed-title block">{houseHeadline(house)}</span>
          {!expanded && skipped && skipPreview ? (
            <span className="route-list-collapsed-skip-note flex min-w-0 items-center gap-2" dir="rtl">
              <SkipSign className="route-list-collapsed-skip-icon shrink-0" />
              <span className="route-list-collapsed-skip-text min-w-0 flex-1 truncate">
                {skipPreview}
              </span>
            </span>
          ) : null}
        </span>
        <ChevronDown className={cn("route-list-collapsed-chevron", expanded && "is-open")} />
      </button>
      {expanded ? (
        <div className="route-list-collapsed-body">
          <HouseCard {...barProps} expanded hideHoursBanner />
        </div>
      ) : null}
    </div>
  );
}

export function RouteList({
  items,
  actionContext,
  originLabel,
  startedFrom,
  hasGps,
  onRequestLocation,
  onChangeOrigin,
  focusId,
}: {
  items: RouteListItem[];
  actionContext: HouseCardActionContext;
  originLabel?: string;
  startedFrom?: "gps" | "neighborhood" | "custom";
  hasGps: boolean;
  onRequestLocation?: () => void;
  onChangeOrigin?: () => void;
  focusId?: string | null;
}) {
  const { t } = useLocale();
  const focusRef = useRef<HTMLLIElement | null>(null);
  const addressReveal = useAddressReveal();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!focusId) return;
    focusRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [focusId]);

  const waitingForGpsOrigin = startedFrom === "gps" && !hasGps;
  const gpsAction =
    waitingForGpsOrigin && onRequestLocation ? (
      <Button type="button" size="sm" variant="outline" className="mt-2" onClick={onRequestLocation}>
        <Navigation className="size-3.5" />
        {t("routeList.enableLocation")}
      </Button>
    ) : null;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-violet-200">
        {gpsAction}
        <p className="font-display text-2xl text-orange-300">{t("routeList.emptyTitle")}</p>
        <p className="mt-2 text-base">{t("routeList.emptyHint")}</p>
      </div>
    );
  }

  const startLabel =
    originLabel ||
    (startedFrom === "gps" ? t("routeList.currentLocation") : t("routeList.fromNeighborhood"));

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col px-3 py-3">
      <ol className="route-list">
        <li className="route-list-card route-list-card--origin">
          <div className="flex items-start gap-3">
            <span className="route-list-origin-mark" aria-hidden="true">
              <MapPin className="size-4" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-base font-medium text-orange-100">{t("originPicker.title")}</p>
                {onChangeOrigin ? (
                  <Button type="button" size="sm" variant="outline" onClick={onChangeOrigin}>
                    {t("common.change")}
                  </Button>
                ) : null}
              </div>
              <p className="mt-0.5 text-base text-violet-300">{startLabel}</p>
              {gpsAction}
            </div>
          </div>
        </li>
        {items.map(({ house, order, hop, skipped, doneCollapsed, legTone, distanceM }, i) => {
          const tone = legTone ?? (skipped ? "skipped" : "open-route");
          const showSkippedHeading =
            skipped && !doneCollapsed && (i === 0 || !items[i - 1]!.skipped);
          return (
            <li
              key={house.id}
              ref={house.id === focusId ? focusRef : undefined}
              className={cn(
                house.id === focusId && "house-list-focus",
                skipped && !doneCollapsed && "route-list-skipped",
              )}
            >
              {showSkippedHeading && !doneCollapsed ? (
                <p className="route-list-skipped-heading">דילגתם</p>
              ) : null}
              <RouteLeg label={hop || undefined} />
              {doneCollapsed ? (
                <RouteListCollapsedHouse
                  house={house}
                  order={order}
                  actionContext={actionContext}
                  skipped={skipped}
                  skipPreview={
                    skipped
                      ? skipReturnActivePreviewLine(actionContext.skipMetaFor?.(house.id)) ??
                        undefined
                      : undefined
                  }
                  expanded={expandedIds.has(house.id)}
                  onToggle={() =>
                    setExpandedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(house.id)) next.delete(house.id);
                      else next.add(house.id);
                      return next;
                    })
                  }
                />
              ) : (
                <div
                  className={cn(
                    "route-list-house",
                    houseFrameClass(tone, skipped, false),
                  )}
                >
                  <HouseCard
                    {...houseCardPropsFor(house, actionContext, {
                      index: order > 0 ? order : undefined,
                      distanceM: addressReveal.distanceAllowed(house.id) ? distanceM : undefined,
                    })}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
