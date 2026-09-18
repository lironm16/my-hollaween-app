import { config, formatDisplayAddress } from "@/lib/config";
import {
  clusterAddressKey,
  clusterHousesByAddress,
  type HouseCluster,
} from "@/lib/house-clusters";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { estimateWalkingMeters } from "@/lib/walk-distance-estimate";
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

  const clusters = clusterHousesByAddress(candidates);
  const ordered = optimizeClusterTour(clusters, origin);
  return summarizeRoute(ordered, origin, startedFrom, accessible, options?.originLabel);
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

function nearestNeighborTour(
  clusters: HouseCluster[],
  origin: LatLng,
  firstCluster?: HouseCluster,
): HouseCluster[] {
  const remaining = clusters.slice();
  const ordered: HouseCluster[] = [];
  if (firstCluster) {
    const idx = remaining.findIndex((cluster) => cluster.key === firstCluster.key);
    if (idx >= 0) ordered.push(remaining.splice(idx, 1)[0]!);
  }
  let cursor = ordered.length > 0 ? clusterPoint(ordered[ordered.length - 1]!) : origin;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i++) {
      const d = estimateWalkingMeters(cursor, clusterPoint(remaining[i]!));
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0]!;
    ordered.push(next);
    cursor = clusterPoint(next);
  }
  return ordered;
}

function cheapestInsertionTour(clusters: HouseCluster[], origin: LatLng): HouseCluster[] {
  if (clusters.length === 0) return [];
  const remaining = clusters.slice();
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < remaining.length; i++) {
    const d = estimateWalkingMeters(origin, clusterPoint(remaining[i]!));
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  const tour = [remaining.splice(bestIdx, 1)[0]!];
  while (remaining.length > 0) {
    let bestClusterIdx = 0;
    let bestInsertPos = 0;
    let bestCost = Number.POSITIVE_INFINITY;
    for (let ci = 0; ci < remaining.length; ci++) {
      const point = clusterPoint(remaining[ci]!);
      for (let pos = 0; pos <= tour.length; pos++) {
        const prev = pos === 0 ? origin : clusterPoint(tour[pos - 1]!);
        const next = pos === tour.length ? null : clusterPoint(tour[pos]!);
        const cost = next
          ? estimateWalkingMeters(prev, point) +
            estimateWalkingMeters(point, next) -
            estimateWalkingMeters(prev, next)
          : estimateWalkingMeters(prev, point);
        if (cost < bestCost) {
          bestCost = cost;
          bestClusterIdx = ci;
          bestInsertPos = pos;
        }
      }
    }
    tour.splice(bestInsertPos, 0, remaining.splice(bestClusterIdx, 1)[0]!);
  }
  return tour;
}

function angularSweepTour(clusters: HouseCluster[], origin: LatLng): HouseCluster[] {
  return clusters.slice().sort((a, b) => {
    const pointA = clusterPoint(a);
    const pointB = clusterPoint(b);
    const angleA = Math.atan2(pointA.lat - origin.lat, pointA.lng - origin.lng);
    const angleB = Math.atan2(pointB.lat - origin.lat, pointB.lng - origin.lng);
    return angleA - angleB;
  });
}

function buildInitialTour(clusters: HouseCluster[], origin: LatLng): HouseCluster[] {
  if (clusters.length === 0) return [];
  if (clusters.length === 1) return clusters.slice();
  if (clusters.length === 2) {
    return clusters
      .slice()
      .sort(
        (a, b) =>
          estimateWalkingMeters(origin, clusterPoint(a)) -
          estimateWalkingMeters(origin, clusterPoint(b)),
      );
  }
  const candidates: HouseCluster[][] = [
    nearestNeighborTour(clusters, origin),
    cheapestInsertionTour(clusters, origin),
    angularSweepTour(clusters, origin),
  ];
  const seeds = clusters
    .slice()
    .sort(
      (a, b) =>
        estimateWalkingMeters(origin, clusterPoint(a)) - estimateWalkingMeters(origin, clusterPoint(b)),
    )
    .slice(0, Math.min(4, clusters.length));
  for (const seed of seeds) {
    candidates.push(nearestNeighborTour(clusters, origin, seed));
  }
  let best = candidates[0]!;
  let bestLen = pathLengthClusters(best, origin);
  for (const tour of candidates.slice(1)) {
    const len = pathLengthClusters(tour, origin);
    if (len < bestLen) {
      bestLen = len;
      best = tour;
    }
  }
  return best;
}

function optimizeClusterTour(clusters: HouseCluster[], origin: LatLng): HouseCluster[] {
  if (clusters.length === 0) return [];
  if (clusters.length > 40) return nearestNeighborTour(clusters, origin);
  const initial = buildInitialTour(clusters, origin);
  return polishClusterTour(initial, origin);
}

function polishClusterTour(clusters: HouseCluster[], origin: LatLng): HouseCluster[] {
  if (clusters.length < 3) return clusters.slice();
  let tour = twoOptClusters(clusters, origin);
  if (clusters.length <= 25) {
    tour = orOptClusters(tour, origin);
    tour = twoOptClusters(tour, origin);
  }
  return tour;
}

function twoOptClusters(clusters: HouseCluster[], origin: LatLng): HouseCluster[] {
  if (clusters.length > 40) return clusters;
  let best = clusters.slice();
  let improved = true;
  let guard = 0;
  while (improved && guard < 120) {
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

function orOptClusters(clusters: HouseCluster[], origin: LatLng): HouseCluster[] {
  if (clusters.length < 4) return clusters;
  let best = clusters.slice();
  let improved = true;
  let guard = 0;
  while (improved && guard < 60) {
    improved = false;
    guard += 1;
    for (let i = 0; i < best.length; i++) {
      const node = best[i]!;
      const without = best.slice(0, i).concat(best.slice(i + 1));
      for (let pos = 0; pos <= without.length; pos++) {
        const candidate = without.slice(0, pos).concat(node, without.slice(pos));
        if (pathLengthClusters(candidate, origin) + 1 < pathLengthClusters(best, origin)) {
          best = candidate;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }
  return best;
}

function pathLengthClusters(clusters: HouseCluster[], origin: LatLng) {
  let total = 0;
  let prev = origin;
  for (const cluster of clusters) {
    const point = clusterPoint(cluster);
    total += estimateWalkingMeters(prev, point);
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
    const leg = estimateWalkingMeters(prev, point);
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

/** Straight-line preview for the map — stops only; dashed approach is drawn separately. */
export function routePreviewPoints(route: WalkingRoute): LatLng[] {
  return dedupeRoutePoints(routePoints(route));
}

/** Drop consecutive stops at the same building — keeps stub/rehearsal lines clean. */
export function dedupeRoutePoints(points: LatLng[], meters = 12): LatLng[] {
  const unique: LatLng[] = [];
  for (const point of points) {
    const last = unique[unique.length - 1];
    if (last && distanceMeters(last, point) < meters) continue;
    unique.push(point);
  }
  return unique;
}

/** Whether to draw a dashed spur from the route start to stop 1. */
export function shouldShowRouteApproach(
  start: LatLng,
  firstStop: LatLng,
  startedFrom?: WalkingRoute["startedFrom"] | null,
): boolean {
  const gap = distanceMeters(start, firstStop);
  if (gap < 12) return false;
  if (startedFrom === "neighborhood" && gap > ROUTE_INCLUDE_ORIGIN_METERS) return false;
  return true;
}

/** Drop the origin leg from a street line — shown as a dashed approach instead. */
function closestLineIndex(line: LatLng[], point: LatLng) {
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < line.length; i++) {
    const d = distanceMeters(line[i], point);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function pathLengthAlongLine(line: LatLng[], fromIdx: number, toIdx: number) {
  if (fromIdx === toIdx) return 0;
  const start = Math.min(fromIdx, toIdx);
  const end = Math.max(fromIdx, toIdx);
  let total = 0;
  for (let i = start + 1; i <= end; i++) total += distanceMeters(line[i - 1]!, line[i]!);
  return total;
}

/** Walking meters per waypoint hop along a street geometry line. */
export function streetLegMeters(waypoints: LatLng[], line: LatLng[]) {
  if (waypoints.length < 2 || line.length < 2) return [];
  const indices = waypoints.map((point) => closestLineIndex(line, point));
  const legs: number[] = [];
  for (let i = 0; i < indices.length - 1; i++) {
    legs.push(pathLengthAlongLine(line, indices[i]!, indices[i + 1]!));
  }
  return legs;
}

/** Replace straight-line hop distances with street distances from OSRM geometry. */
export function applyStreetDistances(
  route: WalkingRoute,
  legMeters: number[],
  options?: { includesOrigin?: boolean },
): WalkingRoute {
  if (legMeters.length === 0 || route.stops.length === 0) return route;
  const includesOrigin = options?.includesOrigin ?? shouldIncludeOriginInRoute(route);
  const expectedLegs = includesOrigin ? route.stops.length : Math.max(0, route.stops.length - 1);
  if (legMeters.length !== expectedLegs) return route;

  let cumulative = 0;
  const stops = route.stops.map((stop, index) => {
    const leg = includesOrigin
      ? legMeters[index]!
      : index === 0
        ? stop.fromPreviousMeters
        : legMeters[index - 1]!;
    cumulative += leg;
    return { ...stop, fromPreviousMeters: leg, cumulativeMeters: cumulative };
  });
  const pace = route.accessible ? ACCESSIBLE_METERS_PER_MIN : WALK_METERS_PER_MIN;
  const perStop = route.accessible ? ACCESSIBLE_MINUTES_PER_STOP : MINUTES_PER_STOP;
  const walkMinutes = Math.ceil(cumulative / pace);
  const stopMinutes = stops.length * perStop;
  return {
    ...route,
    stops,
    totalMeters: cumulative,
    totalMinutes: walkMinutes + stopMinutes,
  };
}

export function stripApproachFromRouteLine(line: LatLng[], firstStop: LatLng, origin: LatLng): LatLng[] {
  if (line.length < 2) return line;
  if (distanceMeters(line[0], origin) > 30) return line;
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < line.length; i++) {
    const d = distanceMeters(line[i], firstStop);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  const sliced = line.slice(bestIdx);
  return sliced.length >= 2 ? sliced : line;
}

export function routeStopLabel(house: PublicHouse) {
  return `${houseHeadline(house)} · ${formatDisplayAddress(house)}`;
}
