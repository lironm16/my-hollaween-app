"use client";

import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HouseCard } from "@/components/house-card";
import { formatDistance } from "@/lib/geo";
import type { WalkingRoute } from "@/lib/route";

function hopLabel(houseIndex: number, fromPreviousMeters: number) {
  if (houseIndex > 0) return "אותו בניין";
  return formatDistance(fromPreviousMeters);
}

function RouteLeg({ label }: { label: string }) {
  return (
    <div className="route-list-leg">
      <span className="route-list-leg-line" aria-hidden="true" />
      <span className="route-list-leg-label">{label}</span>
    </div>
  );
}

export function RouteList({
  route,
  hasGps,
  onRequestLocation,
  onChangeOrigin,
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
          שנו סינון כדי לראות בתים במסלול. «לא ביקרתי» מסתיר בתים שכבר סימנתם.
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
    <div
      className="mx-auto flex w-full min-w-0 max-w-3xl flex-col px-3 py-3"
      style={selectedId ? { paddingBottom: "calc(var(--map-sheet-h, 70dvh) + 1rem)" } : undefined}
    >
      <ol className="route-list">
        <li className="route-list-card">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-black">
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
        {cards.map(({ house, order, hop }, i) => (
          <li key={house.id}>
            <RouteLeg label={hop} />
            <div className="route-list-house">
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
        ))}
      </ol>
    </div>
  );
}
