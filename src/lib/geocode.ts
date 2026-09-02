import { config, inNeighborhood } from "@/lib/config";
import type { AddressHit } from "@/lib/types";

export type { AddressHit } from "@/lib/types";

type NominatimAddress = {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  residential?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  country_code?: string;
};

type NominatimHit = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  lat: string;
  lon: string;
  addresstype?: string;
  display_name?: string;
  address?: NominatimAddress;
};

const USER_AGENT = "HalloweenNeighborhood/1.0 (https://cursor.com; neighborhood halloween map)";
const MIN_GAP_MS = 1100;

let chain: Promise<unknown> = Promise.resolve();

function withNominatimLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastCall = 0;

async function nominatim<T>(path: string, params: Record<string, string>): Promise<T> {
  return withNominatimLock(async () => {
    const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastCall));
    if (wait) await sleep(wait);
    const url = new URL(`https://nominatim.openstreetmap.org/${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    lastCall = Date.now();
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        "Accept-Language": "he",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error("GEOCODER_UNAVAILABLE");
    }
    return (await res.json()) as T;
  });
}

function viewbox() {
  const b = config.map.bounds;
  return `${b.west},${b.north},${b.east},${b.south}`;
}

function roadOf(address?: NominatimAddress) {
  return address?.road || address?.pedestrian || address?.residential || "";
}

function cityOf(address?: NominatimAddress) {
  return address?.city || address?.town || address?.village || "";
}

function formatLabel(hit: NominatimHit): string | null {
  const address = hit.address;
  const road = roadOf(address);
  const suburb = address?.suburb || address?.neighbourhood || "";
  const city = cityOf(address);
  const num = address?.house_number;
  if (!road && !num) return null;
  const street = num && road ? `${road} ${num}` : road || `${num}`;
  const place = suburb || city;
  return place && place !== road ? `${street}, ${place}` : street;
}

function inSearchArea(lat: number, lng: number) {
  const b = config.map.bounds;
  const latPad = 0.0015;
  const lngPad = 0.0015;
  return (
    lat >= b.south - latPad &&
    lat <= b.north + latPad &&
    lng >= b.west - lngPad &&
    lng <= b.east + lngPad
  );
}

function toHit(raw: NominatimHit): AddressHit | null {
  const lat = Number(raw.lat);
  const lng = Number(raw.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!inSearchArea(lat, lng)) return null;
  const city = cityOf(raw.address);
  if (city && !city.includes("רמת גן") && !city.toLowerCase().includes("ramat gan")) return null;
  const skip = new Set(["city", "town", "state", "country", "administrative", "suburb", "neighbourhood"]);
  if (raw.addresstype && skip.has(raw.addresstype) && !raw.address?.house_number && !roadOf(raw.address)) {
    return null;
  }
  const label = formatLabel(raw);
  if (!label) return null;
  const road = roadOf(raw.address);
  if (!road && !raw.address?.house_number) return null;
  return {
    id: `${raw.osm_type ?? "p"}-${raw.osm_id ?? raw.place_id ?? label}`,
    label,
    lat,
    lng,
    road,
    houseNumber: raw.address?.house_number,
    suburb: raw.address?.suburb || raw.address?.neighbourhood,
    city: city || "רמת גן",
    precise: Boolean(raw.address?.house_number),
  };
}

function uniqueHits(hits: AddressHit[]) {
  const seen = new Set<string>();
  const out: AddressHit[] = [];
  for (const hit of hits) {
    const key = `${hit.label}|${hit.lat.toFixed(5)}|${hit.lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
  }
  return out;
}

function rank(hit: AddressHit, query: string) {
  let score = 0;
  if (hit.precise) score += 40;
  if (inNeighborhood(hit.lat, hit.lng)) score += 20;
  const q = query.replace(/\s+/g, "");
  const label = hit.label.replace(/\s+/g, "");
  if (label.includes(q)) score += 10;
  return score;
}

export async function searchAddress(query: string): Promise<AddressHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const withCity = /רמת\s*גן/.test(q) ? q : `${q} רמת גן`;
  const params = {
    format: "jsonv2",
    q: withCity,
    countrycodes: "il",
    viewbox: viewbox(),
    bounded: "1",
    addressdetails: "1",
    limit: "10",
    "accept-language": "he",
  };
  let raw = await nominatim<NominatimHit[]>("search", params);
  if (!Array.isArray(raw) || raw.length === 0) {
    raw = await nominatim<NominatimHit[]>("search", { ...params, bounded: "0" });
  }
  if (!Array.isArray(raw)) return [];
  const hits = uniqueHits(raw.map(toHit).filter((h): h is AddressHit => Boolean(h)));
  hits.sort((a, b) => rank(b, q) - rank(a, q));
  return hits.slice(0, 8);
}

export async function reverseAddress(lat: number, lng: number): Promise<AddressHit | null> {
  const raw = await nominatim<NominatimHit>("reverse", {
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
    zoom: "18",
    addressdetails: "1",
    "accept-language": "he",
  });
  if (!raw || typeof raw !== "object") return null;
  return toHit(raw);
}

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function normalize(text: string) {
  return text.replace(/["״'`]/g, "").replace(/\s+/g, " ").trim();
}

function addressMentions(address: string, hit: AddressHit) {
  const a = normalize(address);
  const road = normalize(hit.road);
  if (road && a.includes(road)) return true;
  if (hit.houseNumber && a.includes(hit.houseNumber) && road) {
    const parts = road.split(" ");
    return parts.some((p) => p.length >= 2 && a.includes(p));
  }
  return normalize(hit.label) === a;
}

export async function assertRealAddress(input: { address: string; lat: number; lng: number }) {
  if (!inNeighborhood(input.lat, input.lng)) {
    throw new Error("OUT_OF_BOUNDS");
  }
  try {
    const hits = await searchAddress(input.address);
    const near = hits.find((hit) => haversineMeters(hit, input) <= 160);
    if (near) return near;
    const reversed = await reverseAddress(input.lat, input.lng);
    if (
      reversed &&
      inNeighborhood(reversed.lat, reversed.lng) &&
      reversed.road &&
      addressMentions(input.address, reversed) &&
      haversineMeters(reversed, input) <= 160
    ) {
      return reversed;
    }
  } catch (error) {
    if (error instanceof Error && error.message === "GEOCODER_UNAVAILABLE") throw error;
    throw new Error("GEOCODER_UNAVAILABLE");
  }
  throw new Error("INVALID_ADDRESS");
}

export function geocodeHttpError(error: unknown): { error: string; status: number } | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "OUT_OF_BOUNDS") {
    return { error: "המיקום מחוץ לגבולות השכונה.", status: 400 };
  }
  if (error.message === "INVALID_ADDRESS") {
    return {
      error: "צריך כתובת אמיתית בשכונה. בחרו מהרשימה או גררו את הסיכה לבית.",
      status: 400,
    };
  }
  if (error.message === "GEOCODER_UNAVAILABLE") {
    return { error: "לא הצלחנו לאמת את הכתובת עכשיו. נסו שוב בעוד רגע.", status: 503 };
  }
  return null;
}
