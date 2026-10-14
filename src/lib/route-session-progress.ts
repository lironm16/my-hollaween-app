import { distanceMeters } from "@/lib/geo";
import type { LatLng, RouteStop, WalkingRoute } from "@/lib/route";

/** Same green as `.house-pin.is-visited` on the map. */
export const ROUTE_VISITED_GREEN = "#059669";
export const ROUTE_VISITED_GREEN_SHADOW = "#047857";

export function stopForHouse(route: WalkingRoute, houseId: string): RouteStop | undefined {
  return route.stops.find((stop) => stop.houses.some((house) => house.id === houseId));
}

export function stopPoint(stop: RouteStop): LatLng {
  const house = stop.house;
  return { lat: house.lat, lng: house.lng };
}

/** Lead house id per stop — stable key for session order. */
export function sessionStopHouseIds(route: WalkingRoute): string[] {
  return route.stops.map((stop) => stop.house.id);
}

export function stopIsDone(
  stop: RouteStop,
  visitedIds: ReadonlySet<string>,
  skippedIds: ReadonlySet<string>,
): boolean {
  return stop.houses.every((house) => visitedIds.has(house.id) || skippedIds.has(house.id));
}

/** Any house at this stop still unvisited and not skipped. */
export function stopHasRemainingActive(
  stop: RouteStop,
  visitedIds: readonly string[],
  skippedIds: readonly string[],
): boolean {
  const visited = new Set(visitedIds);
  const skipped = new Set(skippedIds);
  return stop.houses.some((house) => !visited.has(house.id) && !skipped.has(house.id));
}

/** Longest prefix of session stops that are each fully visited or skipped. */
export function routePrefixStopCount(
  route: WalkingRoute,
  visitedIds: readonly string[],
  skippedIds: readonly string[],
): number {
  const visited = new Set(visitedIds);
  const skipped = new Set(skippedIds);
  let count = 0;
  for (const stop of route.stops) {
    if (!stopIsDone(stop, visited, skipped)) break;
    count += 1;
  }
  return count;
}

export type RouteProgressSegment = {
  points: [LatLng, LatLng];
  done: boolean;
};

/** Paint each stop-to-stop leg green when both endpoint stops are fully visited or skipped. */
export function routeProgressSegments(
  route: WalkingRoute,
  visitedIds: readonly string[],
  skippedIds: readonly string[],
  samePointMeters = 12,
): RouteProgressSegment[] {
  const visited = new Set(visitedIds);
  const skipped = new Set(skippedIds);
  const segments: RouteProgressSegment[] = [];
  for (let i = 1; i < route.stops.length; i++) {
    const prev = route.stops[i - 1]!;
    const curr = route.stops[i]!;
    const a = stopPoint(prev);
    const b = stopPoint(curr);
    if (distanceMeters(a, b) < samePointMeters) continue;
    segments.push({
      points: [a, b],
      done: stopIsDone(prev, visited, skipped) && stopIsDone(curr, visited, skipped),
    });
  }
  return segments;
}

export function approachLegDone(
  route: WalkingRoute,
  visitedIds: readonly string[],
  skippedIds: readonly string[],
): boolean {
  const first = route.stops[0];
  if (!first) return false;
  const visited = new Set(visitedIds);
  const skipped = new Set(skippedIds);
  return stopIsDone(first, visited, skipped);
}
