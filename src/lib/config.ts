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
      // Carto now watermarks raster tiles with "API key required" unless a key is passed.
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      invert: true,
    };

export const config = {
  appName: "בשכונה Halloween",
  brandEn: "Halloween",
  brandHe: "בשכונה",
  tagline: "מפת הבתים המפחידים של השכונה",
  neighborhood:
    process.env.NEXT_PUBLIC_NEIGHBORHOOD_NAME ?? "שיכון ותיקים · חרוזים · נחלת גנים",
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
  catalogCacheSeconds: process.env.NODE_ENV === "production" ? 60 : 0,
  adminCookie: "hw_admin",
  // Vercel serverless cannot keep data/db.json. Local `npm run dev` / `npm start` can.
  durableWrites: process.env.NEXT_PUBLIC_DURABLE_WRITES !== "0",
} as const;

export function inNeighborhood(lat: number, lng: number) {
  const b = config.map.bounds;
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}
