import { distanceMeters } from "@/lib/geo";
import type { LatLng } from "@/lib/route";

/** North edge of גבעת נפוליאון — west→east hops above this skirt the hill. */
const HILL_NORTH_EDGE = 32.09285;

const KRINITZI_LAT = 32.09022;
const KRINITZI_EAST = { lat: KRINITZI_LAT, lng: 34.81185 };
const KRINITZI_WEST = { lat: KRINITZI_LAT, lng: 34.80615 };
const ROKACH_SOUTH = { lat: 32.0902, lng: 34.8097 };
const ROKACH_EAST = { lat: 32.0928, lng: 34.8122 };
const HARMARGANIT_MID = { lat: 32.09346, lng: 34.80942 };
const HARMARGANIT_EAST = { lat: 32.0937, lng: 34.813 };

/** Interior of גבעת נפוליאון. */
const HILL_RING: LatLng[] = [
  { lat: 32.09115, lng: 34.8069 },
  { lat: 32.09115, lng: 34.80935 },
  { lat: 32.09285, lng: 34.80935 },
  { lat: 32.09285, lng: 34.8069 },
];

const NORTH_STREET_EDGE = 32.0948;
const FARM_RING: LatLng[] = [
  { lat: NORTH_STREET_EDGE, lng: 34.802 },
  { lat: NORTH_STREET_EDGE, lng: 34.819 },
  { lat: 32.1008, lng: 34.819 },
  { lat: 32.1008, lng: 34.802 },
];

function pointInRing(point: LatLng, ring: LatLng[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    const crosses =
      a.lat > point.lat !== b.lat > point.lat &&
      point.lng < ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat || 1e-12) + a.lng;
    if (crosses) inside = !inside;
  }
  return inside;
}

function inHill(point: LatLng) {
  return pointInRing(point, HILL_RING);
}

function pathMeters(points: LatLng[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distanceMeters(points[i - 1]!, points[i]!);
  return total;
}

function southSkirt(from: LatLng, to: LatLng): LatLng[] {
  if (from.lng >= to.lng) return [from, KRINITZI_EAST, KRINITZI_WEST, to];
  return [from, KRINITZI_WEST, KRINITZI_EAST, to];
}

function northSkirt(from: LatLng, to: LatLng): LatLng[] {
  if (from.lng >= to.lng) return [from, HARMARGANIT_EAST, HARMARGANIT_MID, to];
  return [from, HARMARGANIT_MID, HARMARGANIT_EAST, to];
}

function rokachSkirt(from: LatLng, to: LatLng): LatLng[] {
  return [from, ROKACH_SOUTH, ROKACH_EAST, to];
}

/** West cluster to east cluster above the hill — straight line crosses the park. */
function crossesHillBarrier(from: LatLng, to: LatLng) {
  const direct = distanceMeters(from, to);
  if (direct < 200) return false;
  if (to.lng <= from.lng + 0.0015) return false;
  if (from.lat <= HILL_NORTH_EDGE || to.lat <= HILL_NORTH_EDGE) return false;
  if (inHill(from) || inHill(to)) return false;
  return true;
}

function segmentCrossesHill(from: LatLng, to: LatLng) {
  const steps = Math.max(6, Math.ceil(distanceMeters(from, to) / 40));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const sample = {
      lat: from.lat + (to.lat - from.lat) * t,
      lng: from.lng + (to.lng - from.lng) * t,
    };
    if (inHill(sample)) return true;
  }
  return false;
}

function skirtMeters(from: LatLng, to: LatLng) {
  const skirts = [rokachSkirt(from, to), southSkirt(from, to)];
  if (from.lat > 32.0918 || to.lat > 32.0918) skirts.push(northSkirt(from, to));
  let best = Number.POSITIVE_INFINITY;
  for (const skirt of skirts) {
    best = Math.min(best, pathMeters(skirt));
  }
  return best;
}

/**
 * Sync walking-distance guess for route ordering.
 * Haversine on short hops; park skirts when the straight segment cuts through גבעת נפוליאון
 * or when hopping west→east above the hill.
 */
export function estimateWalkingMeters(from: LatLng, to: LatLng) {
  const direct = distanceMeters(from, to);
  if (direct < 120) return direct;
  if (crossesHillBarrier(from, to) || segmentCrossesHill(from, to)) {
    return skirtMeters(from, to);
  }
  return direct;
}
