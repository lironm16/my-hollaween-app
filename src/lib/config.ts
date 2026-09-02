const centerLat = Number(process.env.NEXT_PUBLIC_MAP_CENTER_LAT ?? 32.0919);
const centerLng = Number(process.env.NEXT_PUBLIC_MAP_CENTER_LNG ?? 34.8112);
const latPad = 0.0075;
const lngPad = 0.014;

export const config = {
  appName: "Holloween בשכונה",
  brandEn: "Holloween",
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
  tiles: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  catalogCacheSeconds: process.env.NODE_ENV === "production" ? 60 : 0,
  adminCookie: "hw_admin",
} as const;

export function inNeighborhood(lat: number, lng: number) {
  const b = config.map.bounds;
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}
