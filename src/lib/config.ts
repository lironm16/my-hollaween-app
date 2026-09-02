export const config = {
  appName: "הלואין בשכונה",
  tagline: "מפת הבתים המפחידים של השכונה",
  neighborhood: process.env.NEXT_PUBLIC_NEIGHBORHOOD_NAME ?? "שכונת האלונים",
  map: {
    center: {
      lat: Number(process.env.NEXT_PUBLIC_MAP_CENTER_LAT ?? 32.1848),
      lng: Number(process.env.NEXT_PUBLIC_MAP_CENTER_LNG ?? 34.8706),
    },
    zoom: 16,
    minZoom: 14,
    maxZoom: 18,
    bounds: {
      north: 32.1915,
      south: 32.1775,
      west: 34.8615,
      east: 34.8805,
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
