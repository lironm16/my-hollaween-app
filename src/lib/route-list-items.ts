import { houseMatchesSet, type HouseSet } from "@/lib/house-set";
import type { PublicHouse } from "@/lib/types";
import { routeDisplayOrder } from "@/lib/route-display-order";
import { type TourLegTone, tourLegTone } from "@/lib/route-session-progress";
import type { WalkingRoute } from "@/lib/route";

export type RouteListItemInput = {
  house: PublicHouse;
  order: number;
  hop: string;
  skipped: boolean;
  /** Visited — collapsed green row (any order). */
  doneCollapsed?: boolean;
  legTone?: TourLegTone;
  /** @deprecated Use legTone */
  legDone?: boolean;
  /** @deprecated Use legTone */
  legSkipped?: boolean;
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
  routeModeActive?: boolean;
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
    routeModeActive = false,
  } = options;

  const skippedSet = new Set(skippedIds);
  const visitedSet = new Set(visitedIds);

  const items: RouteListItemInput[] = [];
  for (const stop of route.stops) {
    stop.houses.forEach((house, houseIndex) => {
      const allowed = distanceAllowed(house.id);
      const skipped = skippedSet.has(house.id);
      const visited = visitedSet.has(house.id);
      const legTone = tourLegTone(house.id, visitedSet, skippedSet, routeModeActive);
      items.push({
        house,
        order: routeDisplayOrder(house.id, stop.order, sessionDisplayOrders),
        hop:
          !allowed
            ? ""
            : houseIndex > 0
              ? "אותו המיקום"
              : distanceLabel(house.id, stop.fromPreviousMeters),
        skipped,
        legTone,
        legDone: legTone === "visited",
        legSkipped: legTone === "skipped",
        doneCollapsed: visited || skipped,
      });
    });
  }

  return items;
}
