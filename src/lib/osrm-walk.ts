import type { LatLng } from "@/lib/route";

const OSRM_FOOT = "https://router.project-osrm.org/route/v1/foot";
/** Public demo server is happier with shorter batches. */
const BATCH = 24;

function encodePoints(points: LatLng[]) {
  return points.map((point) => `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`).join(";");
}

async function fetchBatch(points: LatLng[]): Promise<LatLng[] | null> {
  if (points.length < 2) return points.slice();
  const url = `${OSRM_FOOT}/${encodePoints(points)}?overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    code?: string;
    routes?: { geometry?: { coordinates?: [number, number][] } }[];
  };
  const coords = data.routes?.[0]?.geometry?.coordinates;
  if (!coords?.length) return null;
  return coords.map(([lng, lat]) => ({ lat, lng }));
}

/** Street-following walking line for the whole in-app route. Falls back to null. */
export async function fetchWalkingGeometry(points: LatLng[]): Promise<LatLng[] | null> {
  if (points.length < 2) return null;
  try {
    if (points.length <= BATCH) return await fetchBatch(points);
    const line: LatLng[] = [];
    for (let i = 0; i < points.length - 1; i += BATCH - 1) {
      const chunk = points.slice(i, Math.min(points.length, i + BATCH));
      const part = await fetchBatch(chunk);
      if (!part) return null;
      if (line.length > 0) part.shift();
      line.push(...part);
    }
    return line.length >= 2 ? line : null;
  } catch {
    return null;
  }
}
