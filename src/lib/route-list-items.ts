import { houseMatchesSet, type HouseSet } from "@/lib/house-set";
import { routeHouseIds } from "@/lib/filter-houses";
import { distanceMeters } from "@/lib/geo";
import { estimateWalkingMeters } from "@/lib/walk-distance-estimate";
import type { PublicHouse } from "@/lib/types";
import { routeDisplayOrder } from "@/lib/route-display-order";
import type { WalkingRoute } from "@/lib/route";

export type RouteListItemInput = {
  house: PublicHouse;
  order: number;
  hop: string;
  skipped: boolean;
  visitedTail?: boolean;
  distanceM?: number;
};

export function buildRouteListItems(options: {
  route: WalkingRoute;
  catalogHouses: PublicHouse[];
  houseSet: HouseSet;
  visitedIds: string[];
  skippedIds: string[];
  origin: { lat: number; lng: number };
  distanceLabel: (houseId: string, meters: number) => string;
  distanceAllowed: (houseId: string) => boolean;
  /** Pinned 1…N for this route session; stops keep numbers after visits until route mode exits. */
  sessionDisplayOrders?: Map<string, number> | null;
}): RouteListItemInput[] {
  const {
    route,
    catalogHouses,
    houseSet,
    visitedIds,
    skippedIds,
    origin,
    distanceLabel,
    distanceAllowed,
    sessionDisplayOrders,
  } = options;

  const routeIds = routeHouseIds(route);
  const skippedSet = new Set(skippedIds);
  const houseById = new Map(
    catalogHouses
      .filter((house) => houseMatchesSet(house, houseSet))
      .map((house) => [house.id, house]),
  );

  const activeItems = route.stops.flatMap((stop) =>
    stop.houses.map((house, houseIndex) => {
      const allowed = distanceAllowed(house.id);
      return {
        house,
        order: routeDisplayOrder(house.id, stop.order, sessionDisplayOrders),
        hop:
          !allowed
            ? ""
            : houseIndex > 0
              ? "אותו המיקום"
              : distanceLabel(house.id, stop.fromPreviousMeters),
        skipped: false,
      };
    }),
  );

  const originPoint = { lat: origin.lat, lng: origin.lng };
  const lastStop = route.stops[route.stops.length - 1];
  let tailCursor = lastStop
    ? { lat: lastStop.house.lat, lng: lastStop.house.lng }
    : originPoint;

  function appendTail(
    ids: string[],
    flags: { skipped: boolean; visitedTail?: boolean },
  ): RouteListItemInput[] {
    const items: RouteListItemInput[] = [];
    for (const id of ids) {
      const house = houseById.get(id);
      if (!house) continue;
      const point = { lat: house.lat, lng: house.lng };
      const legM = estimateWalkingMeters(tailCursor, point);
      items.push({
        house,
        order: routeDisplayOrder(id, 0, sessionDisplayOrders),
        hop: distanceLabel(house.id, legM),
        skipped: flags.skipped,
        visitedTail: flags.visitedTail,
        distanceM: distanceAllowed(house.id) ? distanceMeters(originPoint, point) : undefined,
      });
      tailCursor = point;
    }
    return items;
  }

  const visitedTail = appendTail(
    visitedIds.filter((id) => !routeIds.has(id) && !skippedSet.has(id)),
    { skipped: false, visitedTail: true },
  );
  const skippedTail = appendTail(
    skippedIds.filter((id) => !routeIds.has(id)),
    { skipped: true },
  );
  return [...activeItems, ...visitedTail, ...skippedTail];
}
