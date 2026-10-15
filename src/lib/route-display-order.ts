import type { WalkingRoute } from "@/lib/route";

/** Snapshot stop numbers for the current route session (survives rebuilds after visits). */
export function captureRouteDisplayOrders(route: WalkingRoute): Map<string, number> {
  const orders = new Map<string, number>();
  for (const stop of route.stops) {
    for (const house of stop.houses) {
      orders.set(house.id, stop.order);
    }
  }
  return orders;
}

export function routeDisplayOrder(
  houseId: string,
  fallbackOrder: number,
  sessionOrders: Map<string, number> | null | undefined,
): number {
  if (!sessionOrders) return fallbackOrder;
  return sessionOrders.get(houseId) ?? fallbackOrder;
}

/** Keep pinned stop numbers; assign rebuild order only for houses new to the tour. */
export function mergeRouteDisplayOrders(
  prev: Map<string, number> | null | undefined,
  route: WalkingRoute,
): Map<string, number> {
  const next = new Map<string, number>();
  for (const stop of route.stops) {
    for (const house of stop.houses) {
      const kept = prev?.get(house.id);
      next.set(house.id, kept ?? stop.order);
    }
  }
  return next;
}
