import {
  filterHouses,
  houseFilterMismatchReasons,
  isHouseOwnerClosed,
  routeHouseIds,
} from "@/lib/filter-houses";
import type { AppLocale } from "@/lib/i18n/locale";
import {
  localizedWhyAddedToRoute,
  localizedWhyRemovedFromRoute,
} from "@/lib/i18n/route-change-copy";
import { translate } from "@/lib/i18n/translate";
import { effectiveVisit } from "@/lib/house-state";
import {
  hoursStatus,
  isOnBreak,
  isOpenNowForFilter,
} from "@/lib/hours";
import { resolveVisitWindow } from "@/lib/visit-window";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { HouseSet } from "@/lib/house-set";
import { isPracticeHouse } from "@/lib/practice-house";
import type { PublicHouse } from "@/lib/types";
import {
  buildWalkingRoute,
  buildWalkingRouteOrdered,
  type LatLng,
  type WalkingRoute,
} from "@/lib/route";

export type RouteChangeEntry = {
  name: string;
  reason?: string;
};

export type RouteStatusChangeEntry = RouteChangeEntry & {
  houseId: string;
  house: PublicHouse;
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
  return visible.filter((house) => !isPracticeHouse(house));
}

export function whyRemovedFromRoute(
  house: PublicHouse,
  filters: HouseFiltersState,
  context: RouteChangeContext,
  locale: AppLocale = "he",
): string {
  if (context.skippedIds.includes(house.id)) {
    return localizedWhyRemovedFromRoute(locale, "skipped");
  }
  if (context.visitedIds.includes(house.id)) {
    return localizedWhyRemovedFromRoute(locale, "visited");
  }
  const filterReasons = houseFilterMismatchReasons(house, filters, context, locale);
  if (filterReasons.length > 0) {
    return localizedWhyRemovedFromRoute(locale, "filterMismatch", filterReasons.join(" · "));
  }
  if (isHouseOwnerClosed(house)) return localizedWhyRemovedFromRoute(locale, "closed");
  if (isOnBreak(house, context.now)) return localizedWhyRemovedFromRoute(locale, "onBreak");
  const { from, to } = resolveVisitWindow(filters, context.now);
  if (!isOpenNowForFilter(house, from, to, context.now)) {
    const status = hoursStatus(house, context.now);
    if (status.kind === "before" || status.kind === "beforeEvent") {
      return localizedWhyRemovedFromRoute(locale, "notYetOpen");
    }
    if (status.kind === "between") return localizedWhyRemovedFromRoute(locale, "betweenWindows");
    if (status.kind === "after") return localizedWhyRemovedFromRoute(locale, "afterHours");
    if (status.kind === "closedVisit") return localizedWhyRemovedFromRoute(locale, "closedTonight");
    return localizedWhyRemovedFromRoute(locale, "notOpenNow");
  }
  return localizedWhyRemovedFromRoute(locale, "notFitRoute");
}

export function whyAddedToRoute(
  house: PublicHouse,
  filters: HouseFiltersState,
  context: RouteChangeContext,
  previous?: PublicHouse,
  locale: AppLocale = "he",
): string | undefined {
  if (previous) {
    const wasClosed = isHouseOwnerClosed(previous);
    const nowOpen = !isHouseOwnerClosed(house);
    if (wasClosed && nowOpen) return localizedWhyAddedToRoute(locale, "reopened");
    const wasBreak = isOnBreak(previous, context.now);
    const nowActive = !isOnBreak(house, context.now);
    if (wasBreak && nowActive) return localizedWhyAddedToRoute(locale, "backFromBreak");
    const prevVisit = effectiveVisit(previous);
    const nextVisit = effectiveVisit(house);
    if (prevVisit === "closed" && nextVisit === "come") {
      return localizedWhyAddedToRoute(locale, "backActive");
    }
  }
  const { from, to } = resolveVisitWindow(filters, context.now);
  if (isOpenNowForFilter(house, from, to, context.now)) {
    return localizedWhyAddedToRoute(locale, "openNow");
  }
  return undefined;
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

  /** Skip/restore is progress state only — houses stay on the pinned tour until filters change. */
  void newlySkipped;
  void restored;
  void nextCandidateIds;
  return { removed: [], added: [] };
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
  const routeHouses: PublicHouse[] = [];
  const seen = new Set<string>();

  for (const stop of route?.stops ?? []) {
    for (const house of stop.houses) {
      const fresh = nextVisible.find((item) => item.id === house.id);
      if (!fresh || !visibleIds.has(house.id) || seen.has(house.id)) continue;
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
  const routeStopIds = new Set<string>();
  for (const stop of route?.stops ?? []) {
    for (const house of stop.houses) routeStopIds.add(house.id);
  }
  const skipped = new Set(nextSkippedIds);
  const visited = new Set(context.visitedIds);
  const routeStopsAllDone =
    routeStopIds.size > 0 &&
    [...routeStopIds].every((id) => visited.has(id) || skipped.has(id));
  if (routeStopsAllDone || routeHouses.length === 0) {
    if (!route) return null;
    return {
      ...route,
      stops: [],
      totalMeters: 0,
      totalMinutes: 0,
      origin,
      startedFrom: options?.startedFrom ?? route.startedFrom,
      originLabel: options?.originLabel ?? route.originLabel,
      accessible: Boolean(options?.accessible ?? route.accessible),
    };
  }
  if (includeNew) {
    return buildWalkingRoute(routeHouses, origin, options);
  }
  return buildWalkingRouteOrdered(routeHouses, origin, options);
}

export function routeHousesAfterFilterChange(
  route: WalkingRoute | null,
  houses: PublicHouse[],
  nextFilters: HouseFiltersState,
  context: RouteChangeContext,
  includeNew: boolean,
): PublicHouse[] {
  const nextVisible = filterHouses(houses, nextFilters, context);
  const visibleIds = new Set(nextVisible.map((house) => house.id));
  const routeHouses: PublicHouse[] = [];
  const seen = new Set<string>();

  for (const stop of route?.stops ?? []) {
    for (const house of stop.houses) {
      const fresh = nextVisible.find((item) => item.id === house.id);
      if (!fresh || !visibleIds.has(house.id) || seen.has(house.id)) continue;
      routeHouses.push(fresh);
      seen.add(house.id);
    }
  }

  if (!includeNew) return routeHouses;

  for (const house of routeCandidateHouses(houses, nextFilters, context)) {
    if (seen.has(house.id)) continue;
    routeHouses.push(house);
    seen.add(house.id);
  }
  return routeHouses;
}

/** Rebuild route after filter commit — re-optimizes stop order when houses are added back. */
export function rebuildRouteAfterFilterChange(
  route: WalkingRoute | null,
  houses: PublicHouse[],
  nextFilters: HouseFiltersState,
  context: RouteChangeContext,
  includeNew: boolean,
  origin: LatLng,
  options?: {
    accessible?: boolean;
    startedFrom?: WalkingRoute["startedFrom"];
    originLabel?: string;
  },
): WalkingRoute | null {
  const routeHouses = routeHousesAfterFilterChange(
    route,
    houses,
    nextFilters,
    context,
    includeNew,
  );
  if (routeHouses.length === 0) {
    if (!route) return null;
    return {
      ...route,
      stops: [],
      totalMeters: 0,
      totalMinutes: 0,
      origin,
      startedFrom: options?.startedFrom ?? route.startedFrom,
      originLabel: options?.originLabel ?? route.originLabel,
      accessible: Boolean(options?.accessible ?? route.accessible),
    };
  }
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
  locale: AppLocale = "he",
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
        reason: house
          ? whyRemovedFromRoute(house, nextFilters, context, locale)
          : localizedWhyRemovedFromRoute(locale, "notInFilter"),
      };
    });
  const added = nextVisible
    .filter((house) => !currentIds.has(house.id))
    .map((house) => ({
      name: house.name,
      reason: whyAddedToRoute(house, nextFilters, context, undefined, locale),
    }));
  return { removed, added };
}

/** Human-readable delta for a stop that is still on the active route. */
export function describeRouteStatusChange(
  previous: PublicHouse,
  house: PublicHouse,
  filters: HouseFiltersState,
  context: RouteChangeContext,
  locale: AppLocale = "he",
): string {
  const added = whyAddedToRoute(house, filters, context, previous, locale);
  if (added) return added;
  const removed = whyRemovedFromRoute(house, filters, context, locale);
  if (removed !== localizedWhyRemovedFromRoute(locale, "notFitRoute")) return removed;
  return translate(locale, "routeChange.statusChanged");
}

/** Status-only diffs for houses still on the route (not skipped / visited). */
export function diffActiveRouteStatusChanges(
  route: WalkingRoute | null,
  houses: PublicHouse[],
  filters: HouseFiltersState,
  context: RouteChangeContext,
  previousById: Map<string, PublicHouse>,
  locale: AppLocale = "he",
): RouteStatusChangeEntry[] {
  if (!route || previousById.size === 0) return [];
  const candidateIds = new Set(
    routeCandidateHouses(houses, filters, context).map((house) => house.id),
  );
  const changes: RouteStatusChangeEntry[] = [];
  for (const id of routeHouseIds(route)) {
    if (context.visitedIds.includes(id) || context.skippedIds.includes(id)) continue;
    if (!candidateIds.has(id)) continue;
    const house = houses.find((item) => item.id === id);
    const previous = previousById.get(id);
    if (!house || !previous) continue;
    if (routeStatusKey(previous, filters, context) === routeStatusKey(house, filters, context)) {
      continue;
    }
    changes.push({
      houseId: id,
      name: houseLabel(house, id),
      reason: describeRouteStatusChange(previous, house, filters, context, locale),
      house,
    });
  }
  return changes;
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
  locale: AppLocale = "he",
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
      reason: whyRemovedFromRoute(house, filters, context, locale),
    });
  }

  for (const house of candidates) {
    if (currentIds.has(house.id)) continue;
    const previous = previousById.get(house.id) ?? houses.find((item) => item.id === house.id);
    if (!previous) {
      added.push({
        name: house.name,
        reason: whyAddedToRoute(house, filters, context, undefined, locale),
      });
      continue;
    }
    const wasCandidate = routeCandidateHouses([previous], filters, context).length > 0;
    if (wasCandidate) continue;
    added.push({
      name: house.name,
      reason: whyAddedToRoute(house, filters, context, previous, locale),
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
