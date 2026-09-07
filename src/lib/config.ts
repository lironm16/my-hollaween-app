const centerLat = Number(process.env.NEXT_PUBLIC_MAP_CENTER_LAT ?? 32.0919);
const centerLng = Number(process.env.NEXT_PUBLIC_MAP_CENTER_LNG ?? 34.8112);
const latPad = 0.0075;
const lngPad = 0.014;

const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim() ?? "";

const tiles = cartoKey
  ? {
      url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      invert: false,
    }
  : {
      // tile.openstreetmap.org serves empty tiles to many clients. OSM France
      // still has streets; CSS invert (not grayscale) is the dark Halloween look.
      url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      invert: true,
    };

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

const ADDRESS_AREA_NAMES = [...NEIGHBORHOODS, "הגפן"] as const;

export const config = {
  /** Home-screen / PWA / OS notification name. In-app chrome uses brandEn. */
  appName: "SpookyHouzz",
  brandEn: "Halloween",
  brandHe: "בשכונה",
  /** Browser tab label. Home-screen / PWA stays the app name. */
  tabTitle: "Halloween בשכונה",
  titleWords: ["Halloween בשכונה"] as const,
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
  lat?: number;
  lng?: number;
}): NeighborhoodId | null {
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
  lat?: number;
  lng?: number;
}): string {
  const street = streetPartForDisplay(house.address);
  const area = resolveNeighborhood(house);
  if (!street) return area ?? house.address.trim();
  if (!area) return street;
  return `${street}, ${area}`;
}

function streetPartForDisplay(address: string): string {
  let text = address.trim();
  text = text
    .replace(/,?\s*רמת\s*גן\s*$/iu, "")
    .replace(/,?\s*Ramat\s*Gan\s*$/iu, "")
    .replace(/,?\s*ישראל\s*$/iu, "")
    .trim();
  for (const name of ADDRESS_AREA_NAMES) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(`,?\\s*${escaped}\\s*$`, "u"), "").trim();
  }
  return text;
}

export function houseInNeighborhoods(
  house: { address: string; lat?: number; lng?: number },
  selected: readonly NeighborhoodId[],
) {
  if (selected.length === 0) return false;
  if (selected.length === NEIGHBORHOODS.length) return true;
  const area = resolveNeighborhood(house);
  return area !== null && selected.includes(area);
}
