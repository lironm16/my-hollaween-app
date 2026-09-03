import { distanceMeters } from "@/lib/geo";
import type { LatLng } from "@/lib/route";

/**
 * Use the car / street graph so the line stays on roads and goes around parks.
 * The FOSSGIS foot graph follows park paths; walking time is still estimated
 * from distance on the client.
 */
const OSRM_STREET = "https://routing.openstreetmap.de/routed-car/route/v1/driving";
const OSRM_STREET_FALLBACK = "https://router.project-osrm.org/route/v1/driving";
const UA = "bashchona-halloween/1.0 (neighborhood walking map)";

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

async function fetchOsrm(base: string, from: LatLng, to: LatLng): Promise<LatLng[] | null> {
  const url = `${base}/${encodePoints([from, to])}?overview=full&geometries=geojson&steps=false`;
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

async function fetchLeg(from: LatLng, to: LatLng): Promise<LatLng[] | null> {
  const street = await fetchOsrm(OSRM_STREET, from, to);
  if (street && street.length >= 2) return street;
  return fetchOsrm(OSRM_STREET_FALLBACK, from, to);
}

/** Street-only line that visits points in order — roads around parks, not footpaths. */
export async function fetchWalkingGeometry(points: LatLng[]): Promise<LatLng[] | null> {
  const unique = dedupeNearby(points);
  if (unique.length < 2) return unique.length ? unique : null;
  try {
    const legs = await Promise.all(
      unique.slice(0, -1).map((from, index) => fetchLeg(from, unique[index + 1]!)),
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
