import { distanceMeters } from "@/lib/geo";
import type { LatLng, RouteStop, WalkingRoute } from "@/lib/route";

/** Same green as `.house-pin.is-visited` on the map. */
export const ROUTE_VISITED_GREEN = "#059669";
export const ROUTE_VISITED_GREEN_SHADOW = "#047857";
export const ROUTE_SKIPPED_GRAY = "#64748b";
export const ROUTE_SKIPPED_GRAY_SHADOW = "#475569";
export const ROUTE_ORIGIN_PURPLE = "#a855f7";
export const ROUTE_ORIGIN_PURPLE_SHADOW = "#7e22ce";

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

export type TourLegTone = "visited" | "skipped" | "open-route" | "open-idle";

export type RouteProgressSegment = {
  points: [LatLng, LatLng];
  tone: TourLegTone;
  /** @deprecated Use tone */
  done: boolean;
  /** @deprecated Use tone */
  skipped?: boolean;
};

/** Connector / pin-ring color onto this house — shared by list legs and map lines. */
export function tourLegTone(
  houseId: string,
  visitedIds: ReadonlySet<string>,
  skippedIds: ReadonlySet<string>,
  routeModeActive: boolean,
): TourLegTone {
  if (skippedIds.has(houseId)) return "skipped";
  if (visitedIds.has(houseId)) return "visited";
  return routeModeActive ? "open-route" : "open-idle";
}

/** @deprecated Prefer {@link tourLegTone} */
export function legStyleForHouse(
  houseId: string,
  visitedIds: ReadonlySet<string>,
  skippedIds: ReadonlySet<string>,
): { legDone: boolean; legSkipped: boolean } {
  const tone = tourLegTone(houseId, visitedIds, skippedIds, false);
  return { legDone: tone === "visited", legSkipped: tone === "skipped" };
}

/** Stop-to-stop legs for the full pinned tour; color by the destination stop’s lead house. */
export function routeProgressSegments(
  route: WalkingRoute,
  visitedIds: readonly string[],
  skippedIds: readonly string[],
  routeModeActive = true,
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
    const tone = tourLegTone(curr.house.id, visited, skipped, routeModeActive);
    segments.push({
      points: [a, b],
      tone,
      done: tone === "visited",
      skipped: tone === "skipped",
    });
  }
  return segments;
}

export function tourLegStrokeColors(tone: TourLegTone): { shadow: string; stroke: string } {
  switch (tone) {
    case "visited":
      return { shadow: ROUTE_VISITED_GREEN_SHADOW, stroke: ROUTE_VISITED_GREEN };
    case "skipped":
      return { shadow: ROUTE_SKIPPED_GRAY_SHADOW, stroke: ROUTE_SKIPPED_GRAY };
    case "open-route":
      return { shadow: "#9a3412", stroke: "#f97316" };
    case "open-idle":
      return { shadow: "#78716c", stroke: "#fff7ed" };
  }
}

export function firstRouteStopPoint(route: WalkingRoute): LatLng | null {
  const first = route.stops[0];
  return first ? stopPoint(first) : null;
}

/** First tour stop that still has an unvisited, unskipped house. */
export function nextUnvisitedStopIndex(
  route: WalkingRoute,
  visitedIds: readonly string[],
  skippedIds: readonly string[],
): number | null {
  const visited = new Set(visitedIds);
  const skipped = new Set(skippedIds);
  for (let i = 0; i < route.stops.length; i++) {
    const stop = route.stops[i]!;
    if (!stopIsDone(stop, visited, skipped)) return i;
  }
  return null;
}

export function nextApproachStopPoint(
  route: WalkingRoute,
  visitedIds: readonly string[],
  skippedIds: readonly string[],
): LatLng | null {
  const index = nextUnvisitedStopIndex(route, visitedIds, skippedIds);
  if (index === null) return null;
  return stopPoint(route.stops[index]!);
}

/** Dashed spur is green when every stop before the next target is complete (prefix clear). */
export function approachLegDone(
  route: WalkingRoute,
  visitedIds: readonly string[],
  skippedIds: readonly string[],
): boolean {
  const visited = new Set(visitedIds);
  const skipped = new Set(skippedIds);
  const target = nextUnvisitedStopIndex(route, visitedIds, skippedIds);
  if (target === null) return true;
  if (target === 0) return false;
  for (let j = 0; j < target; j++) {
    const stop = route.stops[j]!;
    if (!stopIsDone(stop, visited, skipped)) return false;
  }
  return true;
}
