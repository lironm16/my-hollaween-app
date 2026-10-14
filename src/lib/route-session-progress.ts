import type { RouteStop, WalkingRoute } from "@/lib/route";

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

/** Marking this house visited stays on the planned prefix (no reorder / compact). */
export function isInOrderRouteVisit(
  plan: WalkingRoute,
  houseId: string,
  visitedIds: readonly string[],
  skippedIds: readonly string[],
  markingVisited: boolean,
): boolean {
  if (!markingVisited) return true;
  const visited = new Set(visitedIds);
  const skipped = new Set(skippedIds);
  if (visited.has(houseId)) return true;

  let stopIndex = -1;
  for (let i = 0; i < plan.stops.length; i++) {
    if (plan.stops[i]!.houses.some((house) => house.id === houseId)) {
      stopIndex = i;
      break;
    }
  }
  if (stopIndex < 0) return false;

  for (let i = 0; i < stopIndex; i++) {
    if (!stopIsDone(plan.stops[i]!, visited, skipped)) return false;
  }
  return true;
}

/** Main-chain segment index (0 = first stop leg on stop-only preview) is painted done. */
export function routeSegmentDoneThroughStop(prefixStopCount: number, segmentIndex: number): boolean {
  return segmentIndex < prefixStopCount;
}

export function approachLegDone(prefixStopCount: number): boolean {
  return prefixStopCount > 0;
}
