"use client";

import type { ReactNode } from "react";
import { Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HouseCard } from "@/components/house-card";
import { formatDistance } from "@/lib/geo";
import type { PublicHouse } from "@/lib/types";
import type { WalkingRoute } from "@/lib/route";

function hopLabel(order: number, houseIndex: number, fromPreviousMeters: number) {
  if (houseIndex > 0) return "אותו בניין";
  if (order === 1) return `מההתחלה · ${formatDistance(fromPreviousMeters)}`;
  return formatDistance(fromPreviousMeters);
}

export function RouteList({
  route,
  hasGps,
  onRequestLocation,
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

  const cards = route.stops.flatMap((stop) =>
    stop.houses.map((house, houseIndex) => ({
      house,
      order: stop.order,
      hop: hopLabel(stop.order, houseIndex, stop.fromPreviousMeters),
    })),
  );

  return (
    <div
      className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-3 px-3 py-3"
      style={selectedId ? { paddingBottom: "calc(var(--map-sheet-h, 70dvh) + 1rem)" } : undefined}
    >
      {gpsAction}

      <ol className="route-card-spine">
        {cards.map(({ house, order, hop }, i) => (
          <li key={house.id} className="route-card-stop">
            <div className="route-card-hop">
              <span className="route-card-hop-label">{hop}</span>
            </div>
            <RouteCardFrame order={order} house={house}>
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
              />
            </RouteCardFrame>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RouteCardFrame({
  order,
  house,
  children,
}: {
  order: number;
  house: PublicHouse;
  children: ReactNode;
}) {
  return (
    <div className="route-card-frame">
      <span className="route-stop-pin" aria-label={`עצירה ${order}, ${house.name}`}>
        <b className="route-stop-num">{order}</b>
      </span>
      {children}
    </div>
  );
}
