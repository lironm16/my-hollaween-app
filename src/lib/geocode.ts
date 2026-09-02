import { config, inNeighborhood } from "@/lib/config";
import { houseNumberFromHit, parseStreetAndNumber } from "@/lib/address-text";
import type { AddressHit } from "@/lib/types";

export type { AddressHit } from "@/lib/types";
export { parseStreetAndNumber } from "@/lib/address-text";

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
      signal: AbortSignal.timeout(5000),
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
  const area = suburb && suburb !== road ? suburb : city;
  return area && !street.includes(area) ? `${street}, ${area}` : street;
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
  const houseNumber = raw.address?.house_number || parseStreetAndNumber(label).num;
  return {
    id: `${raw.osm_type ?? "p"}-${raw.osm_id ?? raw.place_id ?? label}`,
    label,
    lat,
    lng,
    road,
    houseNumber,
    suburb: raw.address?.suburb || raw.address?.neighbourhood,
    city: city || "רמת גן",
    precise: Boolean(raw.address?.house_number),
  };
}

type EsriCandidate = {
  address?: string;
  score?: number;
  location?: { x: number; y: number };
  attributes?: {
    AddNum?: string;
    StName?: string;
    StAddr?: string;
    Nbrhd?: string;
    City?: string;
    Addr_type?: string;
    LongLabel?: string;
  };
};

async function searchEsri(query: string, parsed: { road: string; num?: string }): Promise<AddressHit[]> {
  const b = config.map.bounds;
  const line = parsed.num
    ? `${parsed.road} ${parsed.num}, רמת גן`
    : /רמת\s*גן/.test(query)
      ? query
      : `${query} רמת גן`;
  const url = new URL("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates");
  url.searchParams.set("f", "json");
  url.searchParams.set("SingleLine", line);
  url.searchParams.set("countryCode", "ISR");
  url.searchParams.set("sourceCountry", "ISR");
  url.searchParams.set("langCode", "he");
  url.searchParams.set("maxLocations", "6");
  url.searchParams.set("forStorage", "false");
  url.searchParams.set("outFields", "AddNum,StName,StAddr,Nbrhd,City,Addr_type,LongLabel");
  url.searchParams.set("searchExtent", `${b.west},${b.south},${b.east},${b.north}`);
  url.searchParams.set("location", `${config.map.center.lng},${config.map.center.lat}`);
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { candidates?: EsriCandidate[] };
  const hits: AddressHit[] = [];
  for (const cand of data.candidates ?? []) {
    const lat = Number(cand.location?.y);
    const lng = Number(cand.location?.x);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inSearchArea(lat, lng)) continue;
    const attrs = cand.attributes ?? {};
    if (attrs.Addr_type === "Locality" || attrs.Addr_type === "City" || attrs.Addr_type === "Postal") continue;
    const city = attrs.City || "";
    if (city && !city.includes("רמת גן") && !city.toLowerCase().includes("ramat gan")) continue;
    const road = (attrs.StName || parsed.road).replace(/^רחוב\s+/u, "").trim();
    const num =
      attrs.AddNum ||
      parseStreetAndNumber(attrs.StAddr || "").num ||
      parseStreetAndNumber(attrs.LongLabel || "").num ||
      undefined;
    const point =
      attrs.Addr_type === "PointAddress" ||
      attrs.Addr_type === "Subaddress" ||
      (attrs.Addr_type === "StreetAddress" && Boolean(num));
    const fake: NominatimHit = {
      lat: String(lat),
      lon: String(lng),
      addresstype: point ? "house" : "road",
      address: {
        house_number: point ? num : undefined,
        road,
        suburb: attrs.Nbrhd,
        city: city || "רמת גן",
      },
    };
    const hit = toHit(fake);
    if (hit) {
      if (num && !hit.houseNumber) hit.houseNumber = num;
      hits.push(hit);
    }
  }
  return hits;
}

function attachTypedNumber(hit: AddressHit, num: string): AddressHit {
  const already = houseNumberFromHit(hit);
  if (already === num && hit.houseNumber) return { ...hit, houseNumber: num };
  const road = (hit.road || parseStreetAndNumber(hit.label).road || hit.label.split(",")[0]?.trim() || "").replace(
    new RegExp(`\\s+${num}$`, "u"),
    "",
  );
  const area = hit.suburb && hit.suburb !== road ? hit.suburb : hit.city;
  const label = area ? `${road} ${num}, ${area}` : `${road} ${num}`;
  return { ...hit, road, houseNumber: num, label, precise: hit.precise && already === num };
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
  const bestByLabel = new Map<string, AddressHit>();
  for (const hit of out) {
    const current = bestByLabel.get(hit.label);
    if (!current) {
      bestByLabel.set(hit.label, hit);
      continue;
    }
    const prefer =
      Number(hit.precise) - Number(current.precise) ||
      Number(inNeighborhood(hit.lat, hit.lng)) - Number(inNeighborhood(current.lat, current.lng));
    if (prefer > 0) bestByLabel.set(hit.label, hit);
  }
  return [...bestByLabel.values()];
}

function rank(hit: AddressHit, query: string, parsed?: { road: string; num?: string }) {
  let score = 0;
  if (hit.precise) score += 40;
  if (parsed?.num && hit.houseNumber === parsed.num) score += 30;
  if (parsed?.road && hit.road.includes(parsed.road)) score += 15;
  if (inNeighborhood(hit.lat, hit.lng)) score += 20;
  const q = query.replace(/\s+/g, "");
  const label = hit.label.replace(/\s+/g, "");
  if (label.includes(q)) score += 10;
  return score;
}

export async function searchAddress(query: string): Promise<AddressHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const parsed = parseStreetAndNumber(q);
  const collected: AddressHit[] = [];

  if (parsed.num) {
    try {
      collected.push(...(await searchEsri(q, parsed)));
    } catch {
      // Keep going with OpenStreetMap if the numbered lookup fails.
    }
  }

  const hasNumbered = collected.some((h) => h.precise && (!parsed.num || h.houseNumber === parsed.num));
  if (!hasNumbered) {
    const withCity = /רמת\s*גן/.test(q) ? q : `${q} רמת גן`;
    const params = {
      format: "jsonv2",
      q: parsed.num ? `${parsed.num} ${parsed.road} רמת גן` : withCity,
      countrycodes: "il",
      viewbox: viewbox(),
      bounded: "1",
      addressdetails: "1",
      limit: "10",
      "accept-language": "he",
    };
    let raw = await nominatim<NominatimHit[]>("search", params);
    if (!Array.isArray(raw) || raw.length === 0) {
      raw = await nominatim<NominatimHit[]>("search", { ...params, q: withCity, bounded: "0" });
    }
    if (Array.isArray(raw)) {
      let nom = raw.map(toHit).filter((h): h is AddressHit => Boolean(h));
      if (parsed.num) nom = nom.map((h) => attachTypedNumber(h, parsed.num as string));
      collected.push(...nom);
    }
  }

  const hits = uniqueHits(collected).map((hit) => {
    const fromLabel = parseStreetAndNumber(hit.label).num;
    if (fromLabel && !hit.houseNumber) return { ...hit, houseNumber: fromLabel };
    return hit;
  });
  hits.sort((a, b) => rank(b, q, parsed) - rank(a, q, parsed));
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

export async function assertRealAddress(input: { address: string; lat: number; lng: number }) {
  if (!inNeighborhood(input.lat, input.lng)) {
    throw new Error("OUT_OF_BOUNDS");
  }
  if (!input.address.trim()) {
    throw new Error("INVALID_ADDRESS");
  }
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
