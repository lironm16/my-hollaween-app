"use client";

import { MapPin, Navigation, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HouseCard } from "@/components/house-card";
import { formatDistance } from "@/lib/geo";
import type { RouteStopTravelState } from "@/hooks/use-route-travel";
import type { WalkingRoute } from "@/lib/route";
import { cn } from "@/lib/utils";

function hopLabel(houseIndex: number, fromPreviousMeters: number) {
  if (houseIndex > 0) return "אותו בניין";
  return formatDistance(fromPreviousMeters);
}

function RouteLeg({
  label,
  travelled,
  drawing,
  reveal,
}: {
  label: string;
  travelled?: boolean;
  drawing?: boolean;
  reveal?: number;
}) {
  return (
    <div className="route-list-leg">
      <span
        className={cn(
          "route-list-leg-line",
          travelled && "is-travelled",
          drawing && "is-drawing",
        )}
        style={drawing ? ({ "--route-leg-reveal": `${Math.round((reveal ?? 0) * 100)}%` } as React.CSSProperties) : undefined}
        aria-hidden="true"
      />
      <span className="route-list-leg-label">{label}</span>
    </div>
  );
}

export function RouteList({
  route,
  hasGps,
  onRequestLocation,
  onChangeOrigin,
  onStartTravel,
  travelStarted = false,
  travelCompletedCount = 0,
  travelSweepIndex = null,
  travelLineReveal = 1,
  stopTravelState,
  onSelectHouse,
  selectedId,
  catalogSource,
  likedIds,
  onToggleLike,
  visitedIds,
  onToggleVisited,
  admin = false,
  canEditHouse,
  onShowOnMap,
  onEditHouse,
  editingId,
}: {
  route: WalkingRoute | null;
  hasGps: boolean;
  onRequestLocation?: () => void;
  onChangeOrigin?: () => void;
  onStartTravel?: () => void;
  travelStarted?: boolean;
  travelCompletedCount?: number;
  travelSweepIndex?: number | null;
  travelLineReveal?: number;
  stopTravelState?: (houseId: string) => RouteStopTravelState;
  onSelectHouse: (id: string, index: number) => void;
  selectedId?: string | null;
  catalogSource?: string | null;
  likedIds?: string[];
  onToggleLike?: (id: string) => void;
  visitedIds?: string[];
  onToggleVisited?: (id: string) => void;
  admin?: boolean;
  canEditHouse?: (id: string) => boolean;
  onShowOnMap?: (id: string) => void;
  onEditHouse?: (id: string, index: number) => void;
  editingId?: string | null;
}) {
  const gpsAction =
    !hasGps && onRequestLocation ? (
      <Button type="button" size="sm" variant="outline" className="mt-2" onClick={onRequestLocation}>
        <Navigation className="size-3.5" />
        הפעילו מיקום
      </Button>
    ) : null;

  if (!route) {
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

  const startLabel =
    route.originLabel || (route.startedFrom === "gps" ? "מיקום נוכחי" : "ממרכז השכונה");
  const cards = route.stops.flatMap((stop) =>
    stop.houses.map((house, houseIndex) => ({
      house,
      order: stop.order,
      hop: hopLabel(houseIndex, stop.fromPreviousMeters),
    })),
  );

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col px-3 py-3">
      <ol className="route-list">
        <li className={cn("route-list-card", travelStarted && "is-route-started")}>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "route-list-start-badge inline-flex size-8 shrink-0 items-center justify-center rounded-full text-black",
                travelStarted ? "bg-emerald-500" : "bg-orange-500",
              )}
            >
              <MapPin className="size-4" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-base font-medium text-orange-100">נקודת התחלה</p>
                <div className="flex shrink-0 items-center gap-2">
                  {onChangeOrigin ? (
                    <Button type="button" size="sm" variant="outline" onClick={onChangeOrigin}>
                      שינוי
                    </Button>
                  ) : null}
                  {!travelStarted && onStartTravel && route.stops.length > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      className="bg-emerald-500 text-black hover:bg-emerald-400"
                      onClick={onStartTravel}
                    >
                      <Play className="size-3.5" />
                      התחלה
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="mt-0.5 text-base text-violet-300">{startLabel}</p>
              {travelStarted ? (
                <p className="mt-1 text-sm text-emerald-300">המסלול פעיל — בדרך!</p>
              ) : null}
              {gpsAction}
            </div>
          </div>
        </li>
        {cards.map(({ house, order, hop }, i) => {
          const state = stopTravelState?.(house.id) ?? "upcoming";
          const legTravelled = travelStarted && i < travelCompletedCount;
          const legDrawing = travelStarted && travelSweepIndex === i;
          return (
            <li key={house.id}>
              <RouteLeg
                label={hop}
                travelled={legTravelled && !legDrawing}
                drawing={legDrawing}
                reveal={travelLineReveal}
              />
              <div
                className={cn(
                  "route-list-house",
                  state === "done" && "is-route-done",
                  state === "current" && "is-route-current",
                  state === "sweep" && "is-route-sweep",
                )}
              >
                <HouseCard
                  house={house}
                  catalogSource={catalogSource}
                  liked={likedIds?.includes(house.id)}
                  onToggleLike={onToggleLike ? () => onToggleLike(house.id) : undefined}
                  visited={visitedIds?.includes(house.id)}
                  onToggleVisited={onToggleVisited ? () => onToggleVisited(house.id) : undefined}
                  canEdit={Boolean(canEditHouse?.(house.id))}
                  admin={admin}
                  onShowOnMap={onShowOnMap ? () => onShowOnMap(house.id) : undefined}
                  onOpen={() => onSelectHouse(house.id, i + 1)}
                  onToggleEdit={onEditHouse ? () => onEditHouse(house.id, i + 1) : undefined}
                  editing={editingId === house.id}
                  index={order}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
