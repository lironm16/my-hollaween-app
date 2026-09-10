import { config, formatDisplayAddress } from "@/lib/config";
import {
  clusterAddressKey,
  clusterHousesByAddress,
  type HouseCluster,
} from "@/lib/house-clusters";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";

export type LatLng = { lat: number; lng: number };

export type RouteStop = {
  house: PublicHouse;
  /** All apartments at this address — one map stop. */
  houses: PublicHouse[];
  order: number;
  fromPreviousMeters: number;
  cumulativeMeters: number;
};

/** Include GPS on the street line only when you are already this close to stop 1. */
export const ROUTE_INCLUDE_ORIGIN_METERS = 200;

export type WalkingRoute = {
  stops: RouteStop[];
  totalMeters: number;
  /** Rough walking time including a short stop at each house. */
  totalMinutes: number;
  startedFrom: "gps" | "neighborhood" | "custom";
  origin: LatLng;
  originLabel?: string;
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
 * Google Maps on phones only honors walking with a short waypoint list.
 * The in-app route includes every matching house — no cap.
 */
export const ROUTE_MAPS_MAX_STOPS = 4;
/** GraphHopper Maps accepts many walking points (all in-app stops). */
export const ROUTE_GRAPHHOPPER_MAX_STOPS = 80;

function pointOf(house: PublicHouse): LatLng {
  return { lat: house.lat, lng: house.lng };
}

function clusterPoint(cluster: HouseCluster): LatLng {
  return { lat: cluster.lat, lng: cluster.lng };
}

/** One stop per building, nearest-neighbor, then a light 2-opt polish. */
export function buildWalkingRoute(
  houses: PublicHouse[],
  gps: LatLng | null | undefined,
  options?: { accessible?: boolean; startedFrom?: WalkingRoute["startedFrom"]; originLabel?: string },
): WalkingRoute | null {
  const accessible = Boolean(options?.accessible);
  const candidates = houses
    .filter((house) => Number.isFinite(house.lat) && Number.isFinite(house.lng))
    .filter((house) => (accessible ? house.accessible : true))
    .slice();
  if (candidates.length === 0) return null;

  const startedFrom: WalkingRoute["startedFrom"] =
    options?.startedFrom ??
    (gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lng) ? "gps" : "neighborhood");
  const origin: LatLng =
    gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lng)
      ? { lat: gps.lat, lng: gps.lng }
      : { lat: config.map.center.lat, lng: config.map.center.lng };

  const remaining = clusterHousesByAddress(candidates);
  const ordered: HouseCluster[] = [];
  let cursor = origin;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i++) {
      const d = distanceMeters(cursor, clusterPoint(remaining[i]!));
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0]!;
    ordered.push(next);
    cursor = clusterPoint(next);
  }

  const polished = ordered.length >= 4 ? twoOptClusters(ordered, origin) : ordered;
  return summarizeRoute(polished, origin, startedFrom, accessible, options?.originLabel);
}

/** Cluster in first-seen order — no nearest-neighbor re-sort (pinned / filtered routes). */
export function clusterHousesInOrder(houses: PublicHouse[]): HouseCluster[] {
  const clusters: HouseCluster[] = [];
  const indexByKey = new Map<string, number>();
  for (const house of houses) {
    if (!Number.isFinite(house.lat) || !Number.isFinite(house.lng)) continue;
    const key = clusterAddressKey(house.address);
    const idx = indexByKey.get(key);
    if (idx !== undefined) {
      clusters[idx]!.houses.push(house);
    } else {
      indexByKey.set(key, clusters.length);
      clusters.push({
        key,
        address: house.address,
        lat: house.lat,
        lng: house.lng,
        houses: [house],
      });
    }
  }
  return clusters.map((cluster) => {
    const housesSorted = [...cluster.houses].sort((a, b) =>
      (a.arrival || a.name).localeCompare(b.arrival || b.name, "he"),
    );
    const lat = housesSorted.reduce((sum, house) => sum + house.lat, 0) / housesSorted.length;
    const lng = housesSorted.reduce((sum, house) => sum + house.lng, 0) / housesSorted.length;
    return {
      key: cluster.key,
      address: housesSorted[0]!.address,
      lat,
      lng,
      houses: housesSorted,
    };
  });
}

/** Build a route from houses in list order (no TSP shuffle). */
export function buildWalkingRouteOrdered(
  houses: PublicHouse[],
  origin: LatLng,
  options?: {
    accessible?: boolean;
    startedFrom?: WalkingRoute["startedFrom"];
    originLabel?: string;
  },
): WalkingRoute | null {
  const accessible = Boolean(options?.accessible);
  const candidates = houses
    .filter((house) => Number.isFinite(house.lat) && Number.isFinite(house.lng))
    .filter((house) => (accessible ? house.accessible : true));
  const clusters = clusterHousesInOrder(candidates);
  if (clusters.length === 0) return null;
  const startedFrom = options?.startedFrom ?? "neighborhood";
  return summarizeRoute(clusters, origin, startedFrom, accessible, options?.originLabel);
}

/** Recompute legs for an existing stop order (e.g. after filter trim or GPS origin update). */
export function refreshWalkingRoute(
  route: WalkingRoute,
  origin: LatLng,
  options?: {
    startedFrom?: WalkingRoute["startedFrom"];
    originLabel?: string;
    accessible?: boolean;
  },
): WalkingRoute {
  const clusters: HouseCluster[] = route.stops.map((stop) => ({
    key: clusterAddressKey(stop.house.address),
    address: stop.house.address,
    lat: stop.house.lat,
    lng: stop.house.lng,
    houses: stop.houses,
  }));
  return summarizeRoute(
    clusters,
    origin,
    options?.startedFrom ?? route.startedFrom,
    options?.accessible ?? route.accessible,
    options?.originLabel ?? route.originLabel,
  );
}

/** Drop stops that no longer match the visible house set. */
export function trimWalkingRouteToVisible(
  route: WalkingRoute,
  visibleIds: Set<string>,
): WalkingRoute | null {
  const stops: RouteStop[] = [];
  for (const stop of route.stops) {
    const houses = stop.houses.filter((house) => visibleIds.has(house.id));
    if (houses.length === 0) continue;
    const lead = houses[0]!;
    stops.push({
      ...stop,
      houses,
      house: { ...lead, lat: stop.house.lat, lng: stop.house.lng },
    });
  }
  if (stops.length === 0) return null;
  return { ...route, stops };
}

function twoOptClusters(clusters: HouseCluster[], origin: LatLng): HouseCluster[] {
  if (clusters.length > 40) return clusters;
  let best = clusters.slice();
  let improved = true;
  let guard = 0;
  while (improved && guard < 40) {
    improved = false;
    guard += 1;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const next = best.slice(0, i).concat(best.slice(i, k + 1).reverse(), best.slice(k + 1));
        if (pathLengthClusters(next, origin) + 1 < pathLengthClusters(best, origin)) {
          best = next;
          improved = true;
        }
      }
    }
  }
  return best;
}

function pathLengthClusters(clusters: HouseCluster[], origin: LatLng) {
  let total = 0;
  let prev = origin;
  for (const cluster of clusters) {
    const point = clusterPoint(cluster);
    total += distanceMeters(prev, point);
    prev = point;
  }
  return total;
}

function summarizeRoute(
  clusters: HouseCluster[],
  origin: LatLng,
  startedFrom: WalkingRoute["startedFrom"],
  accessible: boolean,
  originLabel?: string,
): WalkingRoute {
  const stops: RouteStop[] = [];
  let prev = origin;
  let cumulative = 0;
  clusters.forEach((cluster, index) => {
    const point = clusterPoint(cluster);
    const leg = distanceMeters(prev, point);
    cumulative += leg;
    const lead = cluster.houses[0]!;
    stops.push({
      house: { ...lead, lat: cluster.lat, lng: cluster.lng },
      houses: cluster.houses,
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
    originLabel,
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

/** All-stop walking overview — GraphHopper Maps (no Google waypoint cap). */
export function graphhopperWalkingUrl(route: WalkingRoute) {
  const stops = route.stops.slice(0, ROUTE_GRAPHHOPPER_MAX_STOPS);
  if (stops.length === 0) return null;
  const params = new URLSearchParams({ profile: "foot" });
  params.append("point", fmtLatLng(route.origin));
  for (const stop of stops) params.append("point", fmtLatLng(pointOf(stop.house)));
  return `https://graphhopper.com/maps/?${params.toString()}`;
}

export function routePoints(route: WalkingRoute): LatLng[] {
  return route.stops.map((stop) => pointOf(stop.house));
}

/** Whether the walking line should begin at the route origin (not only at stop 1). */
export function shouldIncludeOriginInRoute(route: WalkingRoute): boolean {
  const first = route.stops[0]?.house;
  if (!first) return false;
  const gap = distanceMeters(route.origin, pointOf(first));
  if (gap < 12) return false;
  if (route.startedFrom === "neighborhood") return gap <= ROUTE_INCLUDE_ORIGIN_METERS;
  return true;
}

/** Waypoints for map geometry — includes origin for GPS/custom (and nearby neighborhood). */
export function routeGeometryPoints(route: WalkingRoute): LatLng[] {
  const stops = routePoints(route);
  if (stops.length === 0) return [];
  if (!shouldIncludeOriginInRoute(route)) return stops;
  return [route.origin, ...stops];
}

export function routeStopLabel(house: PublicHouse) {
  return `${houseHeadline(house)} · ${formatDisplayAddress(house)}`;
}
