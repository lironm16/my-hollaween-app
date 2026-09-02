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
};

const WALK_METERS_PER_MIN = 70;
const MINUTES_PER_STOP = 2;
/** Google Maps URL waypoint limit stays comfortable under this. */
export const ROUTE_MAPS_MAX_STOPS = 10;
export const ROUTE_MAX_STOPS = 20;

function pointOf(house: PublicHouse): LatLng {
  return { lat: house.lat, lng: house.lng };
}

/** Nearest-neighbor path, then a light 2-opt polish for short lists. */
export function buildWalkingRoute(
  houses: PublicHouse[],
  gps: LatLng | null | undefined,
  options?: { maxStops?: number },
): WalkingRoute | null {
  const maxStops = options?.maxStops ?? ROUTE_MAX_STOPS;
  const candidates = houses
    .filter((house) => Number.isFinite(house.lat) && Number.isFinite(house.lng))
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
  return summarizeRoute(polished, origin, startedFrom);
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
  const walkMinutes = Math.ceil(cumulative / WALK_METERS_PER_MIN);
  const stopMinutes = stops.length * MINUTES_PER_STOP;
  return {
    stops,
    totalMeters: cumulative,
    totalMinutes: walkMinutes + stopMinutes,
    startedFrom,
    origin,
  };
}

export function formatRouteSummary(route: WalkingRoute) {
  return `${route.stops.length} עצירות · ${formatDistance(route.totalMeters)} · כ־${route.totalMinutes} דק׳`;
}

function fmtLatLng(point: LatLng) {
  return `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
}

/**
 * Multi-stop walking route URL.
 * Path form (`/dir/a/b/c/data=!4m2!4m1!3e2`) opens the map with walking
 * directions on mobile — the api=1+waypoints form often lands on the
 * empty “Dropped pin / N stops” editor (especially on iOS).
 */
export function googleMapsWalkingUrl(route: WalkingRoute) {
  const stops = route.stops.slice(0, ROUTE_MAPS_MAX_STOPS);
  if (stops.length === 0) return null;
  const parts = [fmtLatLng(route.origin), ...stops.map((stop) => fmtLatLng(pointOf(stop.house)))];
  return `https://www.google.com/maps/dir/${parts.join("/")}/data=!4m2!4m1!3e2`;
}

/** Turn-by-turn walking to a single stop (more reliable “start navigating” on phones). */
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

export function routeStopLabel(house: PublicHouse) {
  return `${houseHeadline(house)} · ${formatDisplayAddress(house)}`;
}
