import type { WalkingRoute } from "@/lib/route";

export function routeActiveHouseIds(
  route: WalkingRoute,
  skippedIds: readonly string[],
): string[] {
  const skipped = new Set(skippedIds);
  const ids: string[] = [];
  for (const stop of route.stops) {
    for (const house of stop.houses) {
      if (!skipped.has(house.id)) ids.push(house.id);
    }
  }
  return ids;
}

export function isRouteFullyVisited(
  route: WalkingRoute,
  skippedIds: readonly string[],
  visitedIds: readonly string[],
): boolean {
  const active = routeActiveHouseIds(route, skippedIds);
  if (active.length === 0) return false;
  const visited = new Set(visitedIds);
  return active.every((id) => visited.has(id));
}
