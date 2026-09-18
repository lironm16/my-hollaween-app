import { distanceMeters } from "@/lib/geo";
import type { LatLng } from "@/lib/route";

/**
 * Walking (foot) graph — not car.
 * Stay on neighborhood streets around גבעת נפוליאון when the detour is short.
 * Never send the walk up into ראש ציפור / HaHava (north of המרגנית).
 * If the street loop is much longer (the old 4→5 U on אבא הלל), keep the short
 * named walk along שדרת הנרקיסים / רוקח.
 */
const OSRM_ENDPOINTS = [
  "https://routing.openstreetmap.de/routed-foot/route/v1/foot",
  "https://router.project-osrm.org/route/v1/foot",
];
const UA = "bashchona-halloween/1.0 (neighborhood walking map)";
const OSRM_TIMEOUT_MS = 3000;
const LEG_POOL_SIZE = 8;
const PARK_FRACTION_MAX = 0.08;
/** Accept a hill cut when going around would add more than this. */
const HILL_DETOUR_MAX = 1.2;
/** North of this, footpaths are the farm / Yarkon — not neighborhood streets. */
const NORTH_STREET_EDGE = 32.0948;
/**
 * OSRM snaps north-cluster houses onto campus footpaths and loops through the farm.
 * Cap routing queries here; map pins stay at the real coordinates.
 */
const ROUTING_NORTH_CAP = 32.097;
/** Reject a leg that climbs more than this above its endpoints (forest belt detours). */
const MAX_NORTH_OVERSHOOT = 0.0012;

/** Interior of the hill — west of רוקח, south of המרגנית, north of קריניצי. */
const HILL_RING: LatLng[] = [
  { lat: 32.09115, lng: 34.8069 },
  { lat: 32.09115, lng: 34.80935 },
  { lat: 32.09285, lng: 34.80935 },
  { lat: 32.09285, lng: 34.8069 },
];

const FARM_RING: LatLng[] = [
  { lat: NORTH_STREET_EDGE, lng: 34.802 },
  { lat: NORTH_STREET_EDGE, lng: 34.819 },
  { lat: 32.1008, lng: 34.819 },
  { lat: 32.1008, lng: 34.802 },
];

/** South skirt of the park (קריניצי) — not אבא הלל a block further south. */
const KRINITZI_LAT = 32.09022;
const KRINITZI_EAST = { lat: KRINITZI_LAT, lng: 34.81185 };
const KRINITZI_MID = { lat: KRINITZI_LAT, lng: 34.80915 };
const KRINITZI_WEST = { lat: KRINITZI_LAT, lng: 34.80615 };

/** East street (רוקח) — shorter 4→5 than looping Aba Hillel. */
const ROKACH_SOUTH = { lat: 32.0902, lng: 34.8097 };
const ROKACH_EAST = { lat: 32.0928, lng: 34.8122 };

/** North street (המרגנית), still south of the farm belt. */
const HARMARGANIT_MID = { lat: 32.09346, lng: 34.80942 };
const HARMARGANIT_EAST = { lat: 32.0937, lng: 34.813 };

const STREET_VIAS: LatLng[] = [
  KRINITZI_EAST,
  KRINITZI_MID,
  KRINITZI_WEST,
  ROKACH_SOUTH,
  ROKACH_EAST,
  HARMARGANIT_MID,
  HARMARGANIT_EAST,
];
/** Vias south of here drop onto Aba Hillel and zigzag the grid. */
const SOUTH_STREET_LIMIT = 32.0895;

function encodePoints(points: LatLng[]) {
  return points.map((point) => `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`).join(";");
}

function dedupeNearby(points: LatLng[], meters = 30): LatLng[] {
  const unique: LatLng[] = [];
  for (const point of points) {
    const last = unique[unique.length - 1];
    if (last && distanceMeters(last, point) < meters) continue;
    unique.push(point);
  }
  return unique;
}

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

function inFarm(point: LatLng) {
  return pointInRing(point, FARM_RING);
}

function inPark(point: LatLng) {
  return inHill(point) || inFarm(point);
}

function fractionOn(line: LatLng[], test: (point: LatLng) => boolean) {
  if (line.length === 0) return 0;
  return line.filter(test).length / line.length;
}

function parkFraction(line: LatLng[]) {
  return fractionOn(line, inPark);
}

function farmFraction(line: LatLng[]) {
  return fractionOn(line, inFarm);
}

function lineMaxLat(line: LatLng[]) {
  return line.reduce((max, point) => Math.max(max, point.lat), -Infinity);
}

/** Keep OSRM off Shenkar / ראש ציפור footpaths north of the neighborhood grid. */
function snapForRouting(point: LatLng): LatLng {
  if (point.lat <= ROUTING_NORTH_CAP) return point;
  return { lat: ROUTING_NORTH_CAP, lng: point.lng };
}

function snapRoutePoints(points: LatLng[]) {
  return points.map(snapForRouting);
}

function northOvershootMeters(line: LatLng[], endpoints: LatLng[]) {
  const cap = Math.max(...endpoints.map((point) => point.lat)) + MAX_NORTH_OVERSHOOT;
  const overshoot = lineMaxLat(line) - cap;
  return overshoot > 0 ? overshoot * 111_000 : 0;
}

function finishLegAtTrueStop(line: LatLng[], trueStop: LatLng, snappedStop: LatLng) {
  if (distanceMeters(trueStop, snappedStop) < 8) return line;
  const last = line[line.length - 1];
  if (last && distanceMeters(last, trueStop) < 8) return line;
  return [...line, trueStop];
}

function pathMeters(line: LatLng[]) {
  let total = 0;
  for (let i = 1; i < line.length; i++) total += distanceMeters(line[i - 1]!, line[i]!);
  return total;
}

function viaAroundPark(from: LatLng, to: LatLng, line: LatLng[]): LatLng[] {
  const hits = line.filter(inPark);
  const goingWest = to.lng < from.lng - 0.0003;
  const goingEast = to.lng > from.lng + 0.0003;
  const goingNorth = to.lat > from.lat + 0.0003;
  const pad = 0.0005;
  const around: LatLng[] = [...STREET_VIAS];
  if (hits.length > 0) {
    let south = hits[0]!.lat;
    let north = hits[0]!.lat;
    let west = hits[0]!.lng;
    let east = hits[0]!.lng;
    for (const hit of hits) {
      south = Math.min(south, hit.lat);
      north = Math.max(north, hit.lat);
      west = Math.min(west, hit.lng);
      east = Math.max(east, hit.lng);
    }
    const midLat = (south + north) / 2;
    const midLng = (west + east) / 2;
    around.push({ lat: south - pad, lng: midLng });
    around.push({ lat: south - pad, lng: west - pad });
    around.push({ lat: south - pad, lng: east + pad });
    const northLat = Math.min(north + pad, NORTH_STREET_EDGE - 0.00025);
    if (goingNorth || !goingWest) around.push({ lat: northLat, lng: midLng });
    if (goingNorth) around.push({ lat: northLat, lng: east + pad });
    if (!goingWest) around.push({ lat: midLat, lng: east + pad });
    if (!goingEast) around.push({ lat: midLat, lng: west - pad });
  }
  const unique: LatLng[] = [];
  for (const via of around) {
    if (via.lat >= NORTH_STREET_EDGE) continue;
    if (via.lat < SOUTH_STREET_LIMIT) continue;
    if (unique.some((other) => distanceMeters(other, via) < 40)) continue;
    unique.push(via);
  }
  return unique;
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

function wantSouthSkirt(from: LatLng, to: LatLng) {
  return from.lat < 32.0922 && to.lat < 32.0922;
}

function wantNorthSkirt(from: LatLng, to: LatLng) {
  return from.lat > 32.0918 || to.lat > 32.0918;
}

type OsrmRoute = {
  distance: number;
  line: LatLng[] | null;
};

async function fetchOsrmRoute(points: LatLng[], withGeometry: boolean): Promise<OsrmRoute | null> {
  if (points.length < 2) return null;
  const query = withGeometry
    ? "overview=full&geometries=geojson&steps=false"
    : "overview=false&steps=false";
  for (const base of OSRM_ENDPOINTS) {
    try {
      const url = `${base}/${encodePoints(points)}?${query}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": UA },
        signal: AbortSignal.timeout(OSRM_TIMEOUT_MS),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        routes?: { distance?: number; geometry?: { coordinates?: [number, number][] } }[];
      };
      const route = data.routes?.[0];
      if (!route?.distance) continue;
      const coords = route.geometry?.coordinates;
      const line =
        withGeometry && coords?.length
          ? coords.map(([lng, lat]) => ({ lat, lng }))
          : null;
      return { distance: route.distance, line };
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchOsrm(points: LatLng[]): Promise<LatLng[] | null> {
  const route = await fetchOsrmRoute(points, true);
  return route?.line ?? null;
}

async function runPool<T>(size: number, tasks: Array<() => Promise<T>>) {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await tasks[index]!();
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, tasks.length) }, () => worker()));
  return results;
}

function goingEastAcrossHill(from: LatLng, to: LatLng) {
  return to.lng > from.lng + 0.0015 && distanceMeters(from, to) >= 300;
}

function eastAroundHillSkirt(from: LatLng, to: LatLng): LatLng[] {
  if (from.lng >= to.lng) return [from, KRINITZI_EAST, KRINITZI_MID, HARMARGANIT_MID, to];
  return [from, KRINITZI_WEST, KRINITZI_MID, HARMARGANIT_MID, to];
}

function skirtCandidates(from: LatLng, to: LatLng): LatLng[][] {
  const skirts: LatLng[][] = [];
  if (goingEastAcrossHill(from, to)) skirts.push(eastAroundHillSkirt(from, to));
  skirts.push(rokachSkirt(from, to));
  if (wantSouthSkirt(from, to)) skirts.push(southSkirt(from, to));
  if (wantNorthSkirt(from, to)) skirts.push(northSkirt(from, to));
  return skirts;
}

function acceptableStreetLine(line: LatLng[] | null, endpoints?: LatLng[]) {
  if (!line || line.length < 2) return false;
  if (farmFraction(line) > PARK_FRACTION_MAX || parkFraction(line) > PARK_FRACTION_MAX) return false;
  if (endpoints && endpoints.length >= 2 && northOvershootMeters(line, endpoints) > 0) return false;
  return true;
}

function skirtPolylineFallback(from: LatLng, to: LatLng, trueTo: LatLng): LatLng[] {
  const skirts = skirtCandidates(from, to);
  const best = skirts[0] ?? [from, to];
  return finishLegAtTrueStop(best, trueTo, to);
}

async function fetchWalkLeg(trueFrom: LatLng, trueTo: LatLng): Promise<LatLng[] | null> {
  const from = snapForRouting(trueFrom);
  const to = snapForRouting(trueTo);
  const endpoints = [trueFrom, trueTo];

  const direct = await fetchOsrm([from, to]);
  if (acceptableStreetLine(direct, endpoints)) {
    return finishLegAtTrueStop(direct!, trueTo, to);
  }
  for (const skirt of skirtCandidates(from, to)) {
    const line = await fetchOsrm(skirt);
    if (acceptableStreetLine(line, endpoints)) {
      return finishLegAtTrueStop(line!, trueTo, to);
    }
  }
  const fallback = skirtPolylineFallback(from, to, trueTo);
  return fallback.length >= 2 ? fallback : null;
}

/** Walking line that visits points in order, staying on streets around parks. */
export async function fetchWalkingGeometry(points: LatLng[]): Promise<LatLng[] | null> {
  const unique = dedupeNearby(points);
  if (unique.length < 2) return unique.length ? unique : null;
  try {
    const snapped = snapRoutePoints(unique);
    const directAll = await fetchOsrm(snapped);
    if (acceptableStreetLine(directAll, unique)) return directAll;

    const legTasks = unique
      .slice(0, -1)
      .map((from, index) => () => fetchWalkLeg(from, unique[index + 1]!));
    const legs = await runPool(LEG_POOL_SIZE, legTasks);
    if (legs.some((leg) => !leg || leg.length < 2)) return null;
    const line: LatLng[] = [];
    for (const part of legs) {
      if (line.length > 0) part!.shift();
      line.push(...part!);
    }
    return line.length >= 2 ? line : null;
  } catch {
    return null;
  }
}
