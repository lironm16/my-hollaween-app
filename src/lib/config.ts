const centerLat = Number(process.env.NEXT_PUBLIC_MAP_CENTER_LAT ?? 32.0919);
const centerLng = Number(process.env.NEXT_PUBLIC_MAP_CENTER_LNG ?? 34.8112);
const latPad = 0.0075;
const lngPad = 0.014;

import { CARTO_DARK_TEMPLATE, CARTO_VOYAGER_TEMPLATE } from "@/lib/carto-tiles";

const tiles = {
  // Night = dark_all, day = voyager. Key injected at runtime via /api/map-config.
  url: CARTO_DARK_TEMPLATE,
  lightUrl: CARTO_VOYAGER_TEMPLATE,
  subdomains: "abcd",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  invert: false,
  maxNativeZoom: 18,
} as const;

export const NEIGHBORHOODS = ["שיכון ותיקים", "חרוזים", "נחלת גנים"] as const;
export type NeighborhoodId = (typeof NEIGHBORHOODS)[number];

/** OSM often tags הגפן as נחלת גנים — keep the center so we do not relabel it. */
const GEFEN_CENTER = { lat: 32.08925, lng: 34.81205 };

/** Approximate centers used when address text has no neighborhood name. */
const NEIGHBORHOOD_CENTERS: Record<NeighborhoodId, { lat: number; lng: number }> = {
  חרוזים: { lat: 32.0908, lng: 34.8038 },
  "שיכון ותיקים": { lat: 32.0939, lng: 34.8133 },
  "נחלת גנים": { lat: 32.0928, lng: 34.8188 },
};

export const config = {
  /** Home-screen / PWA / OS notification name. In-app chrome uses brandEn. */
  appName: "HallowHood",
  brandEn: "HallowHood",
  brandHe: "הלואין בשכונה",
  /** Browser tab label. Home-screen / PWA stays the app name. */
  tabTitle: "הלואין בשכונה HallowHood",
  titleWords: ["הלואין בשכונה HallowHood"] as const,
  tagline: "מפת הבתים המפחידים של השכונה",
  neighborhood:
    process.env.NEXT_PUBLIC_NEIGHBORHOOD_NAME ?? "שיכון ותיקים · חרוזים · נחלת גנים",
  neighborhoods: NEIGHBORHOODS,
  map: {
    center: {
      lat: centerLat,
      lng: centerLng,
    },
    zoom: 16,
    minZoom: 14,
    maxZoom: 18,
    bounds: {
      north: centerLat + latPad,
      south: centerLat - latPad,
      west: centerLng - lngPad,
      east: centerLng + lngPad,
    },
  },
  tiles,
  catalogCacheSeconds: process.env.NODE_ENV === "production" ? 30 : 0,
  /** Foreground catalog poll interval (seconds). Default 5 minutes. Override via CATALOG_POLL_SECONDS. */
  catalogPollSeconds: Math.max(
    30,
    Number(process.env.CATALOG_POLL_SECONDS ?? process.env.NEXT_PUBLIC_CATALOG_POLL_SECONDS ?? 300) || 300,
  ),
  /** Neighborhood push alerts. Default off — set NEXT_PUBLIC_PUSH_ALERTS=1 to enable. */
  pushAlertsEnabled: process.env.NEXT_PUBLIC_PUSH_ALERTS === "1",
  adminCookie: "hw_admin",
  // The neighborhood list lives on this app server. Writes are queued one at a time.
  durableWrites: process.env.NEXT_PUBLIC_DURABLE_WRITES !== "0",
  /** Houses open only on this calendar night (local time). */
  eventNight: {
    year: 2026,
    month: 10,
    day: 31,
    labelHe: "31 באוקטובר",
  },
} as const;

export function inNeighborhood(lat: number, lng: number) {
  const b = config.map.bounds;
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}

/** Detect which area a house belongs to from its address text. */
export function neighborhoodFromAddress(address: string): NeighborhoodId | null {
  const text = address.trim();
  if (text.includes("הגפן")) return null;
  for (const name of NEIGHBORHOODS) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(?:^|,)\\s*${escaped}\\s*$`, "u").test(text)) return name;
  }
  for (const name of NEIGHBORHOODS) {
    if (text.includes(name)) return name;
  }
  return null;
}

/** Nearest of the 3 neighborhoods, or null when the pin is in הגפן (or closer to it). */
export function neighborhoodFromCoords(lat: number, lng: number): NeighborhoodId | null {
  let best: NeighborhoodId | null = null;
  let bestDist = (lat - GEFEN_CENTER.lat) ** 2 + (lng - GEFEN_CENTER.lng) ** 2;
  for (const name of NEIGHBORHOODS) {
    const c = NEIGHBORHOOD_CENTERS[name];
    const d = (lat - c.lat) ** 2 + (lng - c.lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = name;
    }
  }
  return best;
}

export function resolveNeighborhood(house: {
  address?: string;
  neighborhood?: NeighborhoodId | null;
  lat?: number;
  lng?: number;
}): NeighborhoodId | null {
  if (house.neighborhood !== undefined) return house.neighborhood;
  const lat = house.lat;
  const lng = house.lng;
  const hasCoords =
    typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);
  const fromCoords = hasCoords ? neighborhoodFromCoords(lat, lng) : null;
  // Map pin outside the 3 neighborhoods: do not keep a typed/OSM area label.
  if (hasCoords && fromCoords === null) return null;
  if (house.address) {
    const fromText = neighborhoodFromAddress(house.address);
    if (fromText) return fromText;
  }
  return fromCoords;
}

/** Street + neighborhood for UI (never city / רמת גן). */
export function formatDisplayAddress(house: {
  address: string;
  neighborhood?: NeighborhoodId | null;
  lat?: number;
  lng?: number;
}): string {
  const street = house.address.trim();
  const area = resolveNeighborhood(house);
  if (!street) return area ?? "";
  if (!area) return street;
  return `${street}, ${area}`;
}

/** Street + city for maps links — neighborhood names confuse geocoders (e.g. חרוזים). */
export function formatMapsAddress(house: { address: string }): string {
  const street = house.address.trim();
  if (!street) return "";
  if (/רמת\s*גן/u.test(street)) return street;
  return `${street}, רמת גן`;
}

export function houseInNeighborhoods(
  house: { address: string; neighborhood?: NeighborhoodId | null; lat?: number; lng?: number },
  selected: readonly NeighborhoodId[],
) {
  if (selected.length === 0) return false;
  if (selected.length === NEIGHBORHOODS.length) return true;
  const area = resolveNeighborhood(house);
  return area !== null && selected.includes(area);
}
