import {
  filterHouses,
  houseFilterMismatchReasons,
  isHouseOwnerClosed,
  routeHouseIds,
} from "@/lib/filter-houses";
import { effectiveVisit } from "@/lib/house-state";
import {
  houseHoursWindows,
  hoursStatus,
  isOnBreak,
  isOpenNowForFilter,
} from "@/lib/hours";
import { resolveVisitWindow } from "@/lib/visit-window";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { HouseSet } from "@/lib/house-set";
import type { PublicHouse } from "@/lib/types";
import {
  buildWalkingRoute,
  buildWalkingRouteOrdered,
  type LatLng,
  type WalkingRoute,
} from "@/lib/route";

export type RouteChangeEntry = {
  name: string;
  reason: string;
};

export type RouteChangeContext = {
  houseSet: HouseSet;
  likedIds: string[];
  visitedIds: string[];
  skippedIds: string[];
  now: Date;
};

function houseLabel(house: PublicHouse | undefined, id: string) {
  return house?.name ?? id;
}

export function routeCandidateHouses(
  houses: PublicHouse[],
  filters: HouseFiltersState,
  context: RouteChangeContext,
) {
  const visible = filterHouses(houses, filters, context);
  const skipped = new Set(context.skippedIds);
  return visible.filter((house) => {
    if (skipped.has(house.id)) return false;
    if (filters.unvisitedOnly && context.visitedIds.includes(house.id)) return false;
    return true;
  });
}

export function whyRemovedFromRoute(
  house: PublicHouse,
  filters: HouseFiltersState,
  context: RouteChangeContext,
): string {
  if (context.skippedIds.includes(house.id)) return "דילגתם על הבית";
  const filterReasons = houseFilterMismatchReasons(house, filters, context);
  if (filterReasons.length > 0) return filterReasons.join(" · ");
  if (isHouseOwnerClosed(house)) return "נסגר";
  if (isOnBreak(house, context.now)) return "בהפסקה";
  const { from, to } = resolveVisitWindow(filters, context.now);
  if (!isOpenNowForFilter(house, from, to, context.now)) {
    const status = hoursStatus(house, context.now);
    if (status.kind === "before" || status.kind === "beforeEvent") return "עדיין לא פתוח";
    if (status.kind === "between") return "בין חלונות שעות";
    if (status.kind === "after") return "אחרי שעות הפתיחה";
    if (status.kind === "closedVisit") return "סגור הלילה";
    return "לא פתוח עכשיו";
  }
  if (filters.unvisitedOnly && context.visitedIds.includes(house.id)) return "כבר ביקרתם";
  return "לא מתאים למסלול";
}

export function whyAddedToRoute(
  house: PublicHouse,
  filters: HouseFiltersState,
  context: RouteChangeContext,
  previous?: PublicHouse,
): string {
  if (previous) {
    const wasClosed = isHouseOwnerClosed(previous);
    const nowOpen = !isHouseOwnerClosed(house);
    if (wasClosed && nowOpen) return "חזר לפתוח";
    const wasBreak = isOnBreak(previous, context.now);
    const nowActive = !isOnBreak(house, context.now);
    if (wasBreak && nowActive) return "חזר מהפסקה";
    const prevVisit = effectiveVisit(previous);
    const nextVisit = effectiveVisit(house);
    if (prevVisit === "closed" && nextVisit === "come") return "חזר לפעילות";
  }
  const { from, to } = resolveVisitWindow(filters, context.now);
  if (isOpenNowForFilter(house, from, to, context.now)) return "פתוח עכשיו";
  if (houseHoursWindows(house).length > 0) return "מתאים לסינון";
  return "בית חדש בסינון";
}

export function diffRouteBySkippedIds(
  route: WalkingRoute | null,
  houses: PublicHouse[],
  filters: HouseFiltersState,
  context: RouteChangeContext,
  nextSkippedIds: string[],
): { removed: RouteChangeEntry[]; added: RouteChangeEntry[] } {
  const currentIds = routeHouseIds(route);
  const prevSkipped = new Set(context.skippedIds);
  const nextSkipped = new Set(nextSkippedIds);
  const newlySkipped = nextSkippedIds.filter((id) => !prevSkipped.has(id));
  const restored = context.skippedIds.filter((id) => !nextSkipped.has(id));
  const nextContext = { ...context, skippedIds: nextSkippedIds };
  const nextCandidateIds = new Set(
    routeCandidateHouses(houses, filters, nextContext).map((house) => house.id),
  );

  const removed: RouteChangeEntry[] = [];
  for (const id of newlySkipped) {
    if (!currentIds.has(id)) continue;
    const house = houses.find((item) => item.id === id);
    removed.push({
      name: houseLabel(house, id),
      reason: "דילגתם על הבית",
    });
  }

  const added: RouteChangeEntry[] = [];
  for (const id of restored) {
    if (currentIds.has(id)) continue;
    const house = houses.find((item) => item.id === id);
    if (!house || !nextCandidateIds.has(id)) continue;
    added.push({
      name: house.name,
      reason: whyAddedToRoute(house, filters, nextContext),
    });
  }

  return { removed, added };
}

export function routeHousesAfterSkipChange(
  route: WalkingRoute | null,
  houses: PublicHouse[],
  filters: HouseFiltersState,
  context: RouteChangeContext,
  nextSkippedIds: string[],
  includeNew: boolean,
): PublicHouse[] {
  const nextContext = { ...context, skippedIds: nextSkippedIds };
  const nextVisible = filterHouses(houses, filters, context);
  const visibleIds = new Set(nextVisible.map((house) => house.id));
  const skipped = new Set(nextSkippedIds);
  const routeHouses: PublicHouse[] = [];
  const seen = new Set<string>();

  for (const stop of route?.stops ?? []) {
    for (const house of stop.houses) {
      const fresh = nextVisible.find((item) => item.id === house.id);
      if (!fresh || !visibleIds.has(house.id) || seen.has(house.id)) continue;
      if (skipped.has(house.id)) continue;
      if (filters.unvisitedOnly && context.visitedIds.includes(house.id)) continue;
      routeHouses.push(fresh);
      seen.add(house.id);
    }
  }

  if (!includeNew) return routeHouses;

  for (const house of routeCandidateHouses(houses, filters, nextContext)) {
    if (seen.has(house.id)) continue;
    routeHouses.push(house);
    seen.add(house.id);
  }
  return routeHouses;
}

/** Rebuild route after skip/restore — re-optimizes stop order when houses are added back. */
export function rebuildRouteAfterSkipChange(
  route: WalkingRoute | null,
  houses: PublicHouse[],
  filters: HouseFiltersState,
  context: RouteChangeContext,
  nextSkippedIds: string[],
  includeNew: boolean,
  origin: LatLng,
  options?: {
    accessible?: boolean;
    startedFrom?: WalkingRoute["startedFrom"];
    originLabel?: string;
  },
): WalkingRoute | null {
  const routeHouses = routeHousesAfterSkipChange(
    route,
    houses,
    filters,
    context,
    nextSkippedIds,
    includeNew,
  );
  if (includeNew) {
    return buildWalkingRoute(routeHouses, origin, options);
  }
  return buildWalkingRouteOrdered(routeHouses, origin, options);
}

export function diffRouteByFilters(
  route: WalkingRoute | null,
  houses: PublicHouse[],
  nextFilters: HouseFiltersState,
  context: RouteChangeContext,
): { removed: RouteChangeEntry[]; added: RouteChangeEntry[] } {
  const currentIds = routeHouseIds(route);
  const nextVisible = filterHouses(houses, nextFilters, context);
  const nextIds = new Set(nextVisible.map((house) => house.id));
  const removed = [...currentIds]
    .filter((id) => !nextIds.has(id))
    .map((id) => {
      const house = houses.find((item) => item.id === id);
      return {
        name: houseLabel(house, id),
        reason: house ? whyRemovedFromRoute(house, nextFilters, context) : "לא בסינון",
      };
    });
  const added = nextVisible
    .filter((house) => !currentIds.has(house.id))
    .filter((house) => !context.skippedIds.includes(house.id))
    .filter((house) => !(nextFilters.unvisitedOnly && context.visitedIds.includes(house.id)))
    .map((house) => ({
      name: house.name,
      reason: whyAddedToRoute(house, nextFilters, context),
    }));
  return { removed, added };
}

function routeStatusKey(
  house: PublicHouse,
  filters: HouseFiltersState,
  context: RouteChangeContext,
) {
  const { from, to } = resolveVisitWindow(filters, context.now);
  return [
    effectiveVisit(house),
    isOnBreak(house, context.now) ? "break" : "active",
    isOpenNowForFilter(house, from, to, context.now) ? "open" : "closed-hours",
    context.skippedIds.includes(house.id) ? "skipped" : "active-skip",
    filterHouses([house], filters, context).length > 0 ? "match" : "filter",
  ].join("|");
}

export function diffRouteByStatus(
  route: WalkingRoute | null,
  houses: PublicHouse[],
  filters: HouseFiltersState,
  context: RouteChangeContext,
  previousById: Map<string, PublicHouse>,
): { removed: RouteChangeEntry[]; added: RouteChangeEntry[] } | null {
  if (!route) return null;
  const currentIds = routeHouseIds(route);
  const candidates = routeCandidateHouses(houses, filters, context);
  const candidateIds = new Set(candidates.map((house) => house.id));
  const removed: RouteChangeEntry[] = [];
  const added: RouteChangeEntry[] = [];

  for (const id of currentIds) {
    const house = houses.find((item) => item.id === id);
    const previous = previousById.get(id);
    if (!house || !previous) continue;
    const wasCandidate = routeCandidateHouses([previous], filters, context).length > 0;
    const isCandidate = candidateIds.has(id);
    if (wasCandidate === isCandidate) {
      if (routeStatusKey(previous, filters, context) === routeStatusKey(house, filters, context)) {
        continue;
      }
    }
    if (!wasCandidate || isCandidate) continue;
    removed.push({
      name: houseLabel(house, id),
      reason: whyRemovedFromRoute(house, filters, context),
    });
  }

  for (const house of candidates) {
    if (currentIds.has(house.id)) continue;
    const previous = previousById.get(house.id) ?? houses.find((item) => item.id === house.id);
    if (!previous) {
      added.push({ name: house.name, reason: whyAddedToRoute(house, filters, context) });
      continue;
    }
    const wasCandidate = routeCandidateHouses([previous], filters, context).length > 0;
    if (wasCandidate) continue;
    added.push({
      name: house.name,
      reason: whyAddedToRoute(house, filters, context, previous),
    });
  }

  if (removed.length === 0 && added.length === 0) return null;
  return { removed, added };
}

export function snapshotRouteHouses(
  route: WalkingRoute | null,
  houses: PublicHouse[],
): Map<string, PublicHouse> {
  const map = new Map<string, PublicHouse>();
  if (!route) return map;
  for (const id of routeHouseIds(route)) {
    const house = houses.find((item) => item.id === id);
    if (house) map.set(id, house);
  }
  return map;
}
