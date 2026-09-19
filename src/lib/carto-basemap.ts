/** Server-only CARTO basemap helpers (key must not use NEXT_PUBLIC_). */

const CARTO_SUBDOMAINS = ["a", "b", "c", "d"] as const;

export function cartoBasemapKey() {
  return process.env.CARTO_BASEMAP_KEY?.trim() ?? "";
}

export function cartoRasterTileUrl(z: string, x: string, y: string, theme: "dark" | "light") {
  const key = cartoBasemapKey();
  if (!key) return null;
  const style = theme === "light" ? "light_all" : "dark_all";
  const subdomain = CARTO_SUBDOMAINS[(Number(x) + Number(y)) % CARTO_SUBDOMAINS.length]!;
  return `https://${subdomain}.basemaps.cartocdn.com/${style}/${z}/${x}/${y}.png?key=${encodeURIComponent(key)}`;
}

export function parseTileCoord(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
