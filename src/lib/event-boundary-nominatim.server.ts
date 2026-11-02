import { parsePointAddressQuery } from "@/lib/event-boundary-address-parse";
import { rankAndFilterStreets } from "@/lib/event-boundary-street-search";
import {
  queryEligibleForPointSearch,
  roundEventBoundaryCoord,
  zoneKeyPoint,
  zoneKeyPointAddress,
} from "@/lib/event-boundary";
import { config } from "@/lib/config";
import { pickStreetCenterlines } from "@/lib/event-boundary-street-geom";
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
  name?: string;
  address?: NominatimAddress;
};

let lastCall = 0;
const MIN_GAP_MS = 1100;

export type NominatimAddress = {
  road?: string;
  pedestrian?: string;
  residential?: string;
  house_number?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  suburb?: string;
};

type NominatimReverseBody = { address?: NominatimAddress; display_name?: string };

async function nominatimReverse(lat: number, lng: number): Promise<NominatimReverseBody | null> {
  const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastCall));
  if (wait) await new Promise((r) => setTimeout(r, wait));
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");
  lastCall = Date.now();
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", "Accept-Language": "he" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  return (await res.json()) as NominatimReverseBody;
}

export async function reverseGeocodeAddress(lat: number, lng: number): Promise<NominatimAddress | null> {
  const body = await nominatimReverse(lat, lng);
  return body?.address ?? null;
}

function settlementFromNominatimAddress(addr: NominatimAddress): string {
  return (
    addr.city?.trim() ||
    addr.town?.trim() ||
    addr.municipality?.trim() ||
    addr.village?.trim() ||
    ""
  );
}

function roadFromNominatimAddress(addr: NominatimAddress): string {
  return addr.road?.trim() || addr.pedestrian?.trim() || addr.residential?.trim() || "";
}

/** Hebrew-friendly single-line label for a map pin (specific address). */
export function formatPointAddressLabel(
  address: NominatimAddress,
  displayName?: string,
): string {
  const road = roadFromNominatimAddress(address);
  const num = address.house_number?.trim();
  const city = settlementFromNominatimAddress(address) || address.suburb?.trim() || "";
  const streetLine = road ? (num ? `${road} ${num}` : road) : "";
  if (streetLine && city) return `${streetLine}, ${city}`;
  if (streetLine) return streetLine;
  if (city) return city;
  const trimmed = displayName?.trim();
  if (trimmed) {
    const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
    return parts.slice(0, 3).join(", ");
  }
  return "נקודה";
}

export async function reverseGeocodePointLabel(
  lat: number,
  lng: number,
): Promise<{ label: string; city?: string } | null> {
  const body = await nominatimReverse(lat, lng);
  if (!body?.address) {
    if (body?.display_name?.trim()) {
      return { label: formatPointAddressLabel({}, body.display_name) };
    }
    return null;
  }
  const city = settlementFromNominatimAddress(body.address) || body.address.suburb?.trim() || undefined;
  return {
    label: formatPointAddressLabel(body.address, body.display_name),
    city,
  };
}

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

export type StreetBoundaryOptions = {
  halfWidthM?: number;
  cityClip?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  zoneClips?: (GeoJSON.Polygon | GeoJSON.MultiPolygon)[];
};

/** Street corridor polygon (~70 m wide) from OSM centerlines. */
export async function streetBoundaryPolygon(
  city: string,
  street: string,
  options: StreetBoundaryOptions = {},
): Promise<GeoJSON.Polygon | GeoJSON.MultiPolygon | null> {
  const halfWidthM = options.halfWidthM ?? 35;
  const hits = await nominatimSearch({
    street,
    city,
    country: "Israel",
    format: "json",
    polygon_geojson: "1",
    countrycodes: "il",
    limit: "12",
    viewbox: viewbox(),
    bounded: "1",
  });

  let cityClip = options.cityClip ?? null;
  if (!cityClip && city.trim()) {
    cityClip = await cityBoundaryPolygon(city);
  }

  const centerlines = pickStreetCenterlines(hits, city, {
    cityClip,
    zoneClips: options.zoneClips,
  });
  if (centerlines.length === 0) return null;

  const rings: [number, number][][] = [];
  for (const line of centerlines) {
    const ring = bufferPolylineLngLat(line, halfWidthM);
    if (ring) rings.push(ring);
  }
  if (rings.length === 0) return null;
  if (rings.length === 1) return { type: "Polygon", coordinates: [rings[0]] };
  return { type: "MultiPolygon", coordinates: rings.map((ring) => [ring]) };
}

type StreetHit = { street: string; city: string; label: string };

function normalizeStreetName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[''""`]/g, "")
    .replace(/\s+/g, " ");
}

/** When the query equals a street name in a city, hide longer names that merely extend it (e.g. אבא הלל vs אבא הלל סילבר). */
export function preferExactStreetMatches(streets: StreetHit[], query: string): StreetHit[] {
  const nq = normalizeStreetName(query);
  if (!nq) return streets;

  const byCity = new Map<string, StreetHit[]>();
  for (const row of streets) {
    const list = byCity.get(row.city) ?? [];
    list.push(row);
    byCity.set(row.city, list);
  }

  const out: StreetHit[] = [];
  for (const list of byCity.values()) {
    const exact = list.filter((s) => normalizeStreetName(s.street) === nq);
    out.push(...(exact.length > 0 ? exact : list));
  }
  return out;
}

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
  return rankAndFilterStreets(out, query, limit).map((row) => ({
    ...row,
    label: `${row.street}, ${row.city}`,
  }));
}

/** Free-text street search (multiple settlements); slower — one Nominatim call. */
export async function searchStreetsNationwide(q: string, limit = 12): Promise<StreetHit[]> {
  const query = q.trim();
  if (!query) return [];
  const hits = await nominatimSearch({
    q: `${query}, Israel`,
    format: "json",
    countrycodes: "il",
    limit: "25",
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
  return rankAndFilterStreets(out, query, limit).map((row) => ({
    ...row,
    label: `${row.street}, ${row.city}`,
  }));
}

export type AddressPointHit = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  city?: string;
};

function digitsFromQuery(q: string): string {
  return q.replace(/\D/g, "");
}

function isSpecificAddressNominatimHit(h: NominatimGeoHit): boolean {
  const hn = h.address?.house_number?.trim();
  if (!hn) return false;
  const at = h.addresstype ?? h.type ?? "";
  if (at === "city" || at === "town" || at === "municipality" || at === "village") {
    return false;
  }
  if (h.class === "place" && h.type === "city") return false;
  return true;
}

function normalizeToken(s: string): string {
  return s.trim().toLowerCase().replace(/['"׳״]/g, "");
}

function streetHitMatchesQuery(h: NominatimGeoHit, street: string): boolean {
  const road = h.address ? roadFromNominatimAddress(h.address) : h.name ?? "";
  const a = normalizeToken(road);
  const b = normalizeToken(street);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

async function geocodePointAddressStreetFallback(query: string): Promise<AddressPointHit[]> {
  const parsed = parsePointAddressQuery(query);
  if (!parsed) return [];

  const { houseNumber, street, city } = parsed;
  const label = `${street} ${houseNumber}, ${city}`;

  const queryVariants = [
    `${houseNumber} ${street}, ${city}`,
    `${street} ${houseNumber}, ${city}`,
    `${street}, ${city}`,
  ];

  for (const qStr of queryVariants) {
    const hits = await nominatimSearch({
      q: `${qStr}, Israel`,
      format: "json",
      countrycodes: "il",
      limit: "12",
      addressdetails: "1",
    });
    const streetHit =
      hits.find((h) => streetHitMatchesQuery(h, street) && h.class === "highway") ??
      hits.find((h) => streetHitMatchesQuery(h, street)) ??
      hits.find((h) => h.address?.road);

    if (!streetHit) continue;

    const lat = Number(streetHit.lat);
    const lng = Number(streetHit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const rLat = roundEventBoundaryCoord(lat);
    const rLng = roundEventBoundaryCoord(lng);
    const resolvedCity =
      settlementFromNominatimAddress(streetHit.address ?? {}) ||
      streetHit.address?.suburb?.trim() ||
      city;

    return [
      {
        id: zoneKeyPointAddress(resolvedCity, street, houseNumber),
        lat: rLat,
        lng: rLng,
        label,
        city: resolvedCity,
      },
    ];
  }

  return [];
}

function scoreAddressHit(h: NominatimGeoHit, query: string): number {
  let score = 0;
  const qDigits = digitsFromQuery(query);
  const hn = h.address?.house_number?.replace(/\D/g, "") ?? "";
  if (qDigits && hn && hn === qDigits) score += 80;
  else if (qDigits && hn.includes(qDigits)) score += 40;
  if (h.address?.house_number) score += 12;
  if (h.class === "building" || h.type === "house" || h.addresstype === "building") score += 8;
  const dn = (h.display_name ?? "").toLowerCase();
  const needle = query.toLowerCase();
  if (dn.includes(needle)) score += 20;
  return score;
}

function nominatimHitToAddressPoint(h: NominatimGeoHit, fallbackQuery: string): AddressPointHit | null {
  const lat = Number(h.lat);
  const lng = Number(h.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const rLat = roundEventBoundaryCoord(lat);
  const rLng = roundEventBoundaryCoord(lng);
  const label = h.address
    ? formatPointAddressLabel(h.address, h.display_name)
    : h.display_name?.split(",").map((p) => p.trim()).slice(0, 3).join(", ") || fallbackQuery;
  const city =
    (h.address ? settlementFromNominatimAddress(h.address) : "") ||
    h.address?.suburb?.trim() ||
    undefined;
  return {
    id: zoneKeyPoint(rLat, rLng),
    lat: rLat,
    lng: rLng,
    label,
    city: city || undefined,
  };
}

/** Forward geocode for specific addresses (map/search mode נקודה). */
export async function searchAddressPoints(q: string, limit = 14): Promise<AddressPointHit[]> {
  const query = q.trim();
  if (!query || !queryEligibleForPointSearch(query)) return [];

  const queryVariants = [query, `${query}, Israel`];

  const ranked: { row: AddressPointHit; score: number }[] = [];
  const seen = new Set<string>();

  for (const qStr of queryVariants) {
    const hits = await nominatimSearch({
      q: qStr,
      format: "json",
      countrycodes: "il",
      limit: "25",
      viewbox: viewbox(),
      bounded: "0",
      addressdetails: "1",
    });
    for (const h of hits) {
      if (!isSpecificAddressNominatimHit(h)) continue;
      const row = nominatimHitToAddressPoint(h, query);
      if (!row) continue;
      const road = h.address ? roadFromNominatimAddress(h.address) : "";
      if (!road && !h.address?.house_number) continue;
      const dedupeKey = `${row.id}|${row.label}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      ranked.push({ row, score: scoreAddressHit(h, query) });
    }
  }

  ranked.sort((a, b) => b.score - a.score || a.row.label.localeCompare(b.row.label, "he"));
  const precise = ranked.slice(0, limit).map((r) => r.row);
  if (precise.length > 0) return precise;

  return geocodePointAddressStreetFallback(query);
}
