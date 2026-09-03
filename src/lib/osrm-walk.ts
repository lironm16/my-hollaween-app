import { distanceMeters } from "@/lib/geo";
import type { LatLng } from "@/lib/route";

/**
 * Walking (foot) graph — not car.
 * Park footpaths are shorter, so we detect cuts through the green strip between
 * חרוזים and שיכון ותיקים / נחלת גנים, and the Rosh Tzipor / HaHava belt north
 * of המרגנית, then walk around on streets instead.
 */
const OSRM_FOOT = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";
const UA = "bashchona-halloween/1.0 (neighborhood walking map)";
const PARK_FRACTION_MAX = 0.08;
/** North of this, footpaths are the farm / Yarkon — not neighborhood streets. */
const NORTH_STREET_EDGE = 32.0948;

/** Interior of גבעת נפוליאון / the strip — not Krinitzi or המרגנית. */
const PARK_RINGS: LatLng[][] = [
  [
    { lat: 32.0908, lng: 34.8064 },
    { lat: 32.0908, lng: 34.8119 },
    { lat: 32.0935, lng: 34.8119 },
    { lat: 32.0935, lng: 34.8064 },
  ],
  [
    { lat: NORTH_STREET_EDGE, lng: 34.802 },
    { lat: NORTH_STREET_EDGE, lng: 34.819 },
    { lat: 32.1008, lng: 34.819 },
    { lat: 32.1008, lng: 34.802 },
  ],
];

/** South skirt of the park (קריניצי) — not אבא הלל a block further south. */
const KRINITZI_LAT = 32.09022;
const KRINITZI_EAST = { lat: KRINITZI_LAT, lng: 34.81185 };
const KRINITZI_MID = { lat: KRINITZI_LAT, lng: 34.80915 };
const KRINITZI_WEST = { lat: KRINITZI_LAT, lng: 34.80615 };
const STREET_VIAS: LatLng[] = [KRINITZI_EAST, KRINITZI_MID, KRINITZI_WEST];
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

function inPark(point: LatLng) {
  return PARK_RINGS.some((ring) => pointInRing(point, ring));
}

function parkFraction(line: LatLng[]) {
  if (line.length === 0) return 0;
  return line.filter(inPark).length / line.length;
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

async function fetchOsrm(points: LatLng[]): Promise<LatLng[] | null> {
  if (points.length < 2) return null;
  const url = `${OSRM_FOOT}/${encodePoints(points)}?overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    routes?: { geometry?: { coordinates?: [number, number][] } }[];
  };
  const coords = data.routes?.[0]?.geometry?.coordinates;
  if (!coords?.length) return null;
  return coords.map(([lng, lat]) => ({ lat, lng }));
}

async function fetchWalkLeg(from: LatLng, to: LatLng): Promise<LatLng[] | null> {
  const direct = await fetchOsrm([from, to]);
  if (!direct || direct.length < 2) return null;
  if (parkFraction(direct) <= PARK_FRACTION_MAX) return direct;

  const viaLines = viaAroundPark(from, to, direct).map((via) => fetchOsrm([from, via, to]));
  const candidates = await Promise.all([fetchOsrm(southSkirt(from, to)), ...viaLines]);
  const ranked = candidates
    .filter((line): line is LatLng[] => Boolean(line && line.length >= 2))
    .map((line) => ({ line, frac: parkFraction(line), meters: pathMeters(line) }))
    .sort((a, b) => a.meters - b.meters || a.frac - b.frac);
  const around = ranked.find((item) => item.frac <= PARK_FRACTION_MAX);
  if (around) return around.line;
  if (ranked[0] && ranked[0].frac < parkFraction(direct)) return ranked[0].line;
  return direct;
}

/** Walking line that visits points in order, staying on streets around parks. */
export async function fetchWalkingGeometry(points: LatLng[]): Promise<LatLng[] | null> {
  const unique = dedupeNearby(points);
  if (unique.length < 2) return unique.length ? unique : null;
  try {
    const legs = await Promise.all(
      unique.slice(0, -1).map((from, index) => fetchWalkLeg(from, unique[index + 1]!)),
    );
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
