import { distanceMeters } from "@/lib/geo";
import type { LatLng } from "@/lib/route";

const OSRM_FOOT = "https://router.project-osrm.org/route/v1/foot";

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

async function fetchLeg(from: LatLng, to: LatLng): Promise<LatLng[] | null> {
  const url = `${OSRM_FOOT}/${encodePoints([from, to])}?overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    routes?: { geometry?: { coordinates?: [number, number][] } }[];
  };
  const coords = data.routes?.[0]?.geometry?.coordinates;
  if (!coords?.length) return null;
  return coords.map(([lng, lat]) => ({ lat, lng }));
}

/** Street-following line that visits points in order, one building at a time. */
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
