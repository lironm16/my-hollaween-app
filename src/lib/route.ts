import { config, formatDisplayAddress } from "@/lib/config";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";

export type LatLng = { lat: number; lng: number };

export type RouteStop = {
  house: PublicHouse;
  order: number;
  fromPreviousMeters: number;
  cumulativeMeters: number;
};

export type WalkingRoute = {
  stops: RouteStop[];
  totalMeters: number;
  /** Rough walking time including a short stop at each house. */
  totalMinutes: number;
  startedFrom: "gps" | "neighborhood";
  origin: LatLng;
  /** Route paced + linked for wheelchair / accessible prefs. */
  accessible: boolean;
};

/** Typical walking pace. */
const WALK_METERS_PER_MIN = 70;
/** Slower pace for wheelchair / accessible movement + extra stop time. */
const ACCESSIBLE_METERS_PER_MIN = 45;
const MINUTES_PER_STOP = 2;
const ACCESSIBLE_MINUTES_PER_STOP = 3;
/**
 * Google Maps on mobile only reliably accepts a few waypoints.
 * Keep overview links short so travelmode=walking is honored.
 */
export const ROUTE_MAPS_MAX_STOPS = 4;
export const ROUTE_MAX_STOPS = 20;

function pointOf(house: PublicHouse): LatLng {
  return { lat: house.lat, lng: house.lng };
}

/** Nearest-neighbor path, then a light 2-opt polish for short lists. */
export function buildWalkingRoute(
  houses: PublicHouse[],
  gps: LatLng | null | undefined,
  options?: { maxStops?: number; accessible?: boolean },
): WalkingRoute | null {
  const maxStops = options?.maxStops ?? ROUTE_MAX_STOPS;
  const accessible = Boolean(options?.accessible);
  const candidates = houses
    .filter((house) => Number.isFinite(house.lat) && Number.isFinite(house.lng))
    .filter((house) => (accessible ? house.accessible : true))
    .slice();
  if (candidates.length === 0) return null;

  const startedFrom: WalkingRoute["startedFrom"] =
    gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lng) ? "gps" : "neighborhood";
  const origin: LatLng =
    startedFrom === "gps"
      ? { lat: gps!.lat, lng: gps!.lng }
      : { lat: config.map.center.lat, lng: config.map.center.lng };

  const remaining = candidates.slice();
  const ordered: PublicHouse[] = [];
  let cursor = origin;

  while (remaining.length > 0 && ordered.length < maxStops) {
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i++) {
      const d = distanceMeters(cursor, pointOf(remaining[i]!));
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0]!;
    ordered.push(next);
    cursor = pointOf(next);
  }

  const polished = ordered.length >= 4 ? twoOpt(ordered, origin) : ordered;
  return summarizeRoute(polished, origin, startedFrom, accessible);
}

function twoOpt(houses: PublicHouse[], origin: LatLng): PublicHouse[] {
  let best = houses.slice();
  let improved = true;
  let guard = 0;
  while (improved && guard < 40) {
    improved = false;
    guard += 1;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const next = best.slice(0, i).concat(best.slice(i, k + 1).reverse(), best.slice(k + 1));
        if (pathLength(next, origin) + 1 < pathLength(best, origin)) {
          best = next;
          improved = true;
        }
      }
    }
  }
  return best;
}

function pathLength(houses: PublicHouse[], origin: LatLng) {
  let total = 0;
  let prev = origin;
  for (const house of houses) {
    const point = pointOf(house);
    total += distanceMeters(prev, point);
    prev = point;
  }
  return total;
}

function summarizeRoute(
  houses: PublicHouse[],
  origin: LatLng,
  startedFrom: WalkingRoute["startedFrom"],
  accessible: boolean,
): WalkingRoute {
  const stops: RouteStop[] = [];
  let prev = origin;
  let cumulative = 0;
  houses.forEach((house, index) => {
    const point = pointOf(house);
    const leg = distanceMeters(prev, point);
    cumulative += leg;
    stops.push({
      house,
      order: index + 1,
      fromPreviousMeters: leg,
      cumulativeMeters: cumulative,
    });
    prev = point;
  });
  const pace = accessible ? ACCESSIBLE_METERS_PER_MIN : WALK_METERS_PER_MIN;
  const perStop = accessible ? ACCESSIBLE_MINUTES_PER_STOP : MINUTES_PER_STOP;
  const walkMinutes = Math.ceil(cumulative / pace);
  const stopMinutes = stops.length * perStop;
  return {
    stops,
    totalMeters: cumulative,
    totalMinutes: walkMinutes + stopMinutes,
    startedFrom,
    origin,
    accessible,
  };
}

export function formatRouteSummary(route: WalkingRoute) {
  const base = `${route.stops.length} עצירות · ${formatDistance(route.totalMeters)} · כ־${route.totalMinutes} דק׳`;
  return route.accessible ? `מסלול נגיש · ${base}` : base;
}

function fmtLatLng(point: LatLng) {
  return `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
}

/**
 * Official Maps URLs directions (api=1). Without api=1, mobile Maps often
 * ignores travelmode and opens the car route editor — which is what broke walking.
 * Mobile supports only a few waypoints, so we cap stops.
 */
export function googleMapsWalkingUrl(route: WalkingRoute) {
  const stops = route.stops.slice(0, ROUTE_MAPS_MAX_STOPS);
  if (stops.length === 0) return null;
  const params = new URLSearchParams({
    api: "1",
    travelmode: "walking",
    origin: fmtLatLng(route.origin),
    destination: fmtLatLng(pointOf(stops[stops.length - 1]!.house)),
  });
  const via = stops.slice(0, -1).map((stop) => fmtLatLng(pointOf(stop.house)));
  if (via.length > 0) params.set("waypoints", via.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Turn-by-turn walking to one stop — most reliable on iPhone. */
export function googleMapsNavigateUrl(origin: LatLng, destination: LatLng) {
  const params = new URLSearchParams({
    api: "1",
    travelmode: "walking",
    dir_action: "navigate",
    origin: fmtLatLng(origin),
    destination: fmtLatLng(destination),
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Apple Maps walking (fallback when Google mishandles the link on iOS). */
export function appleMapsWalkingUrl(origin: LatLng, destination: LatLng) {
  const params = new URLSearchParams({
    saddr: fmtLatLng(origin),
    daddr: fmtLatLng(destination),
    dirflg: "w",
  });
  return `https://maps.apple.com/?${params.toString()}`;
}

export function routeStopLabel(house: PublicHouse) {
  return `${houseHeadline(house)} · ${formatDisplayAddress(house)}`;
}
