import { readCatalogPollSeconds } from "@/lib/catalog-poll";

const centerLat = Number(process.env.NEXT_PUBLIC_MAP_CENTER_LAT ?? 32.0919);
const centerLng = Number(process.env.NEXT_PUBLIC_MAP_CENTER_LNG ?? 34.8112);
const latPad = 0.0075;
const lngPad = 0.014;

import { OSM_TILE_ATTRIBUTION, OSM_TILE_TEMPLATE } from "@/lib/carto-tiles";

const tiles = {
  // Safe default until /api/map-config returns CARTO (key ok) or keeps OSM fallback.
  url: OSM_TILE_TEMPLATE,
  subdomains: "abc",
  attribution: OSM_TILE_ATTRIBUTION,
  invert: false,
  maxNativeZoom: 19,
} as const;

export const NEIGHBORHOODS = ["שיכון ותיקים", "חרוזים", "נחלת גנים", "הגפן"] as const;
export type NeighborhoodId = (typeof NEIGHBORHOODS)[number];

const LEGACY_NEIGHBORHOOD_ALIASES: Record<string, NeighborhoodId> = {
  "שכונת הגפן": "הגפן",
  /** OSM suburb label for שיכון ותיקים (e.g. הזמיר). */
  ותיקים: "שיכון ותיקים",
};

/** Approximate centers used when address text has no neighborhood name. */
const NEIGHBORHOOD_CENTERS: Record<NeighborhoodId, { lat: number; lng: number }> = {
  חרוזים: { lat: 32.0908, lng: 34.8038 },
  "שיכון ותיקים": { lat: 32.0939, lng: 34.8133 },
  הגפן: { lat: 32.08925, lng: 34.81205 },
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
    process.env.NEXT_PUBLIC_NEIGHBORHOOD_NAME ??
    "שיכון ותיקים · חרוזים · נחלת גנים · הגפן",
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
  /** Foreground catalog poll interval (seconds). Prefer live value from /api/catalog on clients. */
  catalogPollSeconds: readCatalogPollSeconds(),
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
  /** Street address and arrival instructions unlock at this local time on event night. */
  addressReveal: {
    hour: 12,
    minute: 0,
  },
  /** Last moment visitors can submit a new house (local time). Admins bypass. */
  addHouseCutoff: {
    year: 2026,
    month: 10,
    day: 30,
    hour: 23,
    minute: 59,
    labelHe: "30 באוקטובר, 23:59",
  },
} as const;

export function inNeighborhood(lat: number, lng: number) {
  const b = config.map.bounds;
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}

export function normalizeNeighborhoodId(value: unknown): NeighborhoodId | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const aliased = LEGACY_NEIGHBORHOOD_ALIASES[trimmed] ?? trimmed;
  return (NEIGHBORHOODS as readonly string[]).includes(aliased) ? (aliased as NeighborhoodId) : null;
}

/** Map OSM / geocoder suburb labels to a known neighborhood. */
export function suburbToNeighborhood(suburb: string): NeighborhoodId | null {
  const normalized = normalizeNeighborhoodId(suburb.trim());
  return normalized === undefined ? null : normalized;
}

/** Detect which area a house belongs to from its address text. */
export function neighborhoodFromAddress(address: string): NeighborhoodId | null {
  const text = address.trim();
  for (const name of NEIGHBORHOODS) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(?:^|,)\\s*${escaped}\\s*$`, "u").test(text)) return name;
  }
  for (const name of NEIGHBORHOODS) {
    if (text.includes(name)) return name;
  }
  return null;
}

/** Event-night house areas (subset of the map box — not every pin in bounds). */
const NEIGHBORHOOD_ZONES: Record<
  NeighborhoodId,
  { south: number; north: number; west: number; east: number }
> = {
  חרוזים: { south: 32.0888, north: 32.0924, west: 34.8018, east: 34.8052 },
  "שיכון ותיקים": { south: 32.0898, north: 32.0952, west: 34.8088, east: 34.8178 },
  "נחלת גנים": { south: 32.0897, north: 32.0938, west: 34.8103, east: 34.8198 },
  הגפן: { south: 32.08835, north: 32.0908, west: 34.8098, east: 34.8138 },
};

function inNeighborhoodZone(lat: number, lng: number, zone: (typeof NEIGHBORHOOD_ZONES)[NeighborhoodId]) {
  return lat >= zone.south && lat <= zone.north && lng >= zone.west && lng <= zone.east;
}

function nearestNeighborhood(lat: number, lng: number) {
  let best: NeighborhoodId = NEIGHBORHOODS[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const name of NEIGHBORHOODS) {
    const c = NEIGHBORHOOD_CENTERS[name];
    const d = (lat - c.lat) ** 2 + (lng - c.lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = name;
    }
  }
  return { best, bestDist };
}

/** Nearest neighborhood center (for labels that only say רמת גן). */
export function neighborhoodFromCoords(lat: number, lng: number): NeighborhoodId {
  return nearestNeighborhood(lat, lng).best;
}

/** One of the four event neighborhoods, or null when the pin is outside their area. */
export function neighborhoodAtEventLocation(lat: number, lng: number): NeighborhoodId | null {
  if (!inNeighborhood(lat, lng)) return null;
  const matches = NEIGHBORHOODS.filter((name) =>
    inNeighborhoodZone(lat, lng, NEIGHBORHOOD_ZONES[name]),
  );
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  let best = matches[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const name of matches) {
    const c = NEIGHBORHOOD_CENTERS[name];
    const d = (lat - c.lat) ** 2 + (lng - c.lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = name;
    }
  }
  return best;
}

export function houseLocationAllowed(lat: number, lng: number) {
  return neighborhoodAtEventLocation(lat, lng) !== null;
}

/** Neighborhood for a pin — only when inside one of the four event zones (never nearest-center guess). */
export function neighborhoodLabelForPin(
  lat: number,
  lng: number,
  _suburb?: string,
): NeighborhoodId | null {
  return neighborhoodAtEventLocation(lat, lng);
}

/** Hood from pin only when inside one of the four event zones; else null (אחר). */
export function neighborhoodInferredFromPin(lat: number, lng: number): NeighborhoodId | null {
  return neighborhoodAtEventLocation(lat, lng);
}

export function allowedNeighborhoodsMessage() {
  return `בחרו בית ב${NEIGHBORHOODS.slice(0, -1).join(", ")} או ${NEIGHBORHOODS[NEIGHBORHOODS.length - 1]}.`;
}

export function resolveNeighborhood(house: {
  address?: string;
  neighborhood?: NeighborhoodId | null;
  lat?: number;
  lng?: number;
}): NeighborhoodId | null {
  if (
    typeof house.lat === "number" &&
    typeof house.lng === "number" &&
    Number.isFinite(house.lat) &&
    Number.isFinite(house.lng)
  ) {
    return neighborhoodAtEventLocation(house.lat, house.lng);
  }
  const stored = house.neighborhood;
  if (stored !== undefined && stored !== null) {
    return normalizeNeighborhoodId(stored) ?? null;
  }
  if (house.address) {
    const fromText = neighborhoodFromAddress(house.address);
    if (fromText) return fromText;
  }
  return null;
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
  if (selected.length === 0 || selected.length === NEIGHBORHOODS.length) return true;
  const area = resolveNeighborhood(house);
  return area !== null && selected.includes(area);
}
