import { distanceMeters } from "@/lib/geo";
import type { LatLng } from "@/lib/route";

/**
 * Walking (foot) graph — not car.
 * Park footpaths are shorter, so we detect cuts through the green strip between
 * חרוזים and שיכון ותיקים / נחלת גנים and walk around on streets instead.
 */
const OSRM_FOOT = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";
const UA = "bashchona-halloween/1.0 (neighborhood walking map)";
const PARK_FRACTION_MAX = 0.12;

/** Green / park corridor the foot graph uses as a shortcut. */
const PARK_RINGS: LatLng[][] = [
  [
    { lat: 32.09035, lng: 34.80595 },
    { lat: 32.09035, lng: 34.81245 },
    { lat: 32.09385, lng: 34.81245 },
    { lat: 32.09385, lng: 34.80595 },
  ],
];

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

function viaAroundPark(line: LatLng[]): LatLng[] {
  const hits = line.filter(inPark);
  if (hits.length === 0) return [];
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
  const pad = 0.00135;
  const midLat = (south + north) / 2;
  const midLng = (west + east) / 2;
  return [
    { lat: south - pad, lng: midLng },
    { lat: north + pad, lng: midLng },
    { lat: midLat, lng: west - pad },
    { lat: midLat, lng: east + pad },
    { lat: south - pad, lng: west - pad },
    { lat: south - pad, lng: east + pad },
    { lat: north + pad, lng: west - pad },
    { lat: north + pad, lng: east + pad },
  ];
}

async function fetchOsrm(from: LatLng, to: LatLng): Promise<LatLng[] | null> {
  const url = `${OSRM_FOOT}/${encodePoints([from, to])}?overview=full&geometries=geojson&steps=false`;
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

async function walkVia(from: LatLng, via: LatLng, to: LatLng): Promise<LatLng[] | null> {
  const [first, second] = await Promise.all([fetchOsrm(from, via), fetchOsrm(via, to)]);
  if (!first || first.length < 2 || !second || second.length < 2) return null;
  return first.concat(second.slice(1));
}

async function fetchWalkLeg(from: LatLng, to: LatLng): Promise<LatLng[] | null> {
  const direct = await fetchOsrm(from, to);
  if (!direct || direct.length < 2) return null;
  if (parkFraction(direct) <= PARK_FRACTION_MAX) return direct;

  const candidates = await Promise.all(viaAroundPark(direct).map((via) => walkVia(from, via, to)));
  const ranked = candidates
    .filter((line): line is LatLng[] => Boolean(line && line.length >= 2))
    .map((line) => ({ line, frac: parkFraction(line), meters: pathMeters(line) }))
    .sort((a, b) => a.frac - b.frac || a.meters - b.meters);
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
