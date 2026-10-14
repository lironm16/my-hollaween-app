"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, MapPin, Navigation } from "lucide-react";
import { HouseCard } from "@/components/house-card";
import { houseCardPropsFor, type HouseCardActionContext } from "@/components/house-card-actions";
import { useAddressReveal } from "@/hooks/use-address-reveal";
import { houseHeadline } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export type RouteListItem = {
  house: PublicHouse;
  order: number;
  hop: string;
  skipped: boolean;
  doneCollapsed?: boolean;
  legDone?: boolean;
  legSkipped?: boolean;
  visitedTail?: boolean;
  distanceM?: number;
};

function RouteLeg({ label, done, skipped }: { label?: string; done?: boolean; skipped?: boolean }) {
  return (
    <div className={cn("route-list-leg", !label && "route-list-leg--line-only")}>
      <span
        className={cn(
          "route-list-leg-line",
          done && "route-list-leg-line--done",
          skipped && "route-list-leg-line--skipped",
        )}
        aria-hidden="true"
      />
      {label ? (
        <span
          className={cn(
            "route-list-leg-label",
            done && "route-list-leg-label--done",
            skipped && "route-list-leg-label--skipped",
          )}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}

function RouteListCollapsedHouse({
  house,
  order,
  actionContext,
  skipped,
  expanded,
  onToggle,
}: {
  house: PublicHouse;
  order: number;
  actionContext: HouseCardActionContext;
  skipped: boolean;
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
        <span className="route-list-collapsed-title">{houseHeadline(house)}</span>
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
  originLegDone,
}: {
  items: RouteListItem[];
  actionContext: HouseCardActionContext;
  originLabel?: string;
  startedFrom?: "gps" | "neighborhood" | "custom";
  hasGps: boolean;
  onRequestLocation?: () => void;
  onChangeOrigin?: () => void;
  focusId?: string | null;
  /** First leg from start → stop 1 is green when the first stop is done. */
  originLegDone?: boolean;
}) {
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
        הפעילו מיקום
      </Button>
    ) : null;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-violet-200">
        {gpsAction}
        <p className="font-display text-2xl text-orange-300">אין עצירות במסלול</p>
        <p className="mt-2 text-base">
          שנו סינון כדי לראות בתים במסלול. בתים שכבר סימנתם כביקור לא נכללים במסלול.
        </p>
      </div>
    );
  }

  const startLabel = originLabel || (startedFrom === "gps" ? "מיקום נוכחי" : "ממרכז השכונה");

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col px-3 py-3">
      <ol className="route-list">
        <li className={cn("route-list-card", originLegDone && "route-list-card--done")}>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-black",
                originLegDone ? "bg-emerald-500" : "bg-orange-500",
              )}
            >
              <MapPin className="size-4" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-base font-medium text-orange-100">נקודת התחלה</p>
                {onChangeOrigin ? (
                  <Button type="button" size="sm" variant="outline" onClick={onChangeOrigin}>
                    שינוי
                  </Button>
                ) : null}
              </div>
              <p className="mt-0.5 text-base text-violet-300">{startLabel}</p>
              {gpsAction}
            </div>
          </div>
        </li>
        {items.map(({ house, order, hop, skipped, doneCollapsed, legDone, legSkipped, visitedTail, distanceM }, i) => {
          const showSkippedHeading =
            skipped && !doneCollapsed && !visitedTail && (i === 0 || !items[i - 1]!.skipped);
          const showVisitedHeading =
            visitedTail && (i === 0 || !items[i - 1]?.visitedTail);
          return (
            <li
              key={house.id}
              ref={house.id === focusId ? focusRef : undefined}
              className={cn(
                house.id === focusId && "house-list-focus",
                skipped && !doneCollapsed && "route-list-skipped",
                visitedTail && "route-list-visited",
              )}
            >
              {showVisitedHeading ? (
                <p className="route-list-visited-heading">ביקרתם (מחוץ למסלול)</p>
              ) : null}
              {showSkippedHeading && !doneCollapsed ? (
                <p className="route-list-skipped-heading">דילגתם</p>
              ) : null}
              <RouteLeg label={hop || undefined} done={legDone} skipped={legSkipped} />
              {doneCollapsed ? (
                <RouteListCollapsedHouse
                  house={house}
                  order={order}
                  actionContext={actionContext}
                  skipped={skipped}
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
                    skipped && "route-list-house--skipped",
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
