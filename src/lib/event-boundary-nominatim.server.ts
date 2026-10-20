import { config } from "@/lib/config";
import { bufferPolylineLngLat } from "@/lib/line-buffer";

const USER_AGENT = "HalloweenNeighborhood/1.0 (event-boundary; https://cursor.com)";

type NominatimGeoHit = {
  lat: string;
  lon: string;
  display_name?: string;
  geojson?: GeoJSON.Geometry;
  class?: string;
  type?: string;
  addresstype?: string;
};

let lastCall = 0;
const MIN_GAP_MS = 1100;

async function nominatimSearch(params: Record<string, string>): Promise<NominatimGeoHit[]> {
  const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastCall));
  if (wait) await new Promise((r) => setTimeout(r, wait));
  const url = new URL("https://nominatim.openstreetmap.org/search");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  lastCall = Date.now();
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", "Accept-Language": "he" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("nominatim_unavailable");
  return (await res.json()) as NominatimGeoHit[];
}

function viewbox() {
  const b = config.map.bounds;
  return `${b.west},${b.north},${b.east},${b.south}`;
}

function pickBestCity(hits: NominatimGeoHit[], city: string): NominatimGeoHit | null {
  const needle = city.trim();
  for (const h of hits) {
    if (h.geojson && (h.type === "administrative" || h.addresstype === "city" || h.class === "place")) {
      if (h.display_name?.includes(needle)) return h;
    }
  }
  return hits.find((h) => h.geojson) ?? null;
}

export async function cityBoundaryPolygon(city: string): Promise<GeoJSON.Polygon | GeoJSON.MultiPolygon | null> {
  const hits = await nominatimSearch({
    q: city,
    format: "json",
    polygon_geojson: "1",
    countrycodes: "il",
    limit: "5",
    viewbox: viewbox(),
    bounded: "0",
  });
  const hit = pickBestCity(hits, city);
  if (!hit?.geojson) return null;
  if (hit.geojson.type === "Polygon" || hit.geojson.type === "MultiPolygon") {
    return hit.geojson;
  }
  return null;
}

function lineFromGeometry(g: GeoJSON.Geometry): [number, number][] | null {
  if (g.type === "LineString") return g.coordinates as [number, number][];
  if (g.type === "MultiLineString") {
    let best: [number, number][] | null = null;
    for (const line of g.coordinates) {
      const ls = line as [number, number][];
      if (!best || ls.length > best.length) best = ls;
    }
    return best;
  }
  if (g.type === "Polygon") {
    return g.coordinates[0] as [number, number][];
  }
  return null;
}

/** Street corridor polygon (~70 m wide) from OSM geometry. */
export async function streetBoundaryPolygon(
  city: string,
  street: string,
  halfWidthM = 35,
): Promise<GeoJSON.Polygon | null> {
  const hits = await nominatimSearch({
    street,
    city,
    country: "Israel",
    format: "json",
    polygon_geojson: "1",
    countrycodes: "il",
    limit: "8",
    viewbox: viewbox(),
    bounded: "1",
  });
  const hit =
    hits.find((h) => h.geojson && /road|street|residential|pedestrian/i.test(h.class ?? h.type ?? "")) ??
    hits.find((h) => h.geojson) ??
    null;
  if (!hit?.geojson) return null;
  const line = lineFromGeometry(hit.geojson);
  if (!line || line.length < 2) return null;
  const ring = bufferPolylineLngLat(line, halfWidthM);
  if (!ring) return null;
  return { type: "Polygon", coordinates: [ring] };
}

type StreetHit = { street: string; city: string; label: string };

function streetFromNominatimHit(
  h: NominatimGeoHit & {
    address?: {
      road?: string;
      pedestrian?: string;
      residential?: string;
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
      suburb?: string;
    };
  },
  fallbackCity: string,
): StreetHit | null {
  const road = h.address?.road ?? h.address?.pedestrian ?? h.address?.residential;
  if (!road) return null;
  const city =
    h.address?.city ??
    h.address?.town ??
    h.address?.village ??
    h.address?.municipality ??
    h.address?.suburb ??
    fallbackCity;
  if (!city) return null;
  return { street: road, city, label: `${road}, ${city}` };
}

export async function searchStreets(city: string, q: string, limit = 20): Promise<StreetHit[]> {
  const query = q.trim();
  if (!query) return [];
  const hits = await nominatimSearch({
    q: `${query}, ${city}`,
    format: "json",
    countrycodes: "il",
    limit: String(Math.min(limit, 15)),
    viewbox: viewbox(),
    bounded: "1",
    addressdetails: "1",
  });
  const out: StreetHit[] = [];
  const seen = new Set<string>();
  for (const h of hits) {
    const row = streetFromNominatimHit(h, city);
    if (!row) continue;
    const key = `${row.city}|${row.street}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/** Free-text street search (multiple settlements); slower — one Nominatim call. */
export async function searchStreetsNationwide(q: string, limit = 12): Promise<StreetHit[]> {
  const query = q.trim();
  if (!query) return [];
  const hits = await nominatimSearch({
    q: `${query}, Israel`,
    format: "json",
    countrycodes: "il",
    limit: String(Math.min(limit + 6, 20)),
    viewbox: viewbox(),
    bounded: "0",
    addressdetails: "1",
  });
  const out: StreetHit[] = [];
  const seen = new Set<string>();
  for (const h of hits) {
    const row = streetFromNominatimHit(h, "");
    if (!row || !row.city) continue;
    const key = `${row.city}|${row.street}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out.slice(0, limit);
}
