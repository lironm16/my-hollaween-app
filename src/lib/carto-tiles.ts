/** Fallback when CARTO key is missing or over quota (unkeyed CARTO is watermark-only). */
export const OSM_TILE_TEMPLATE = "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png";

export const OSM_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, tiles &copy; <a href="https://www.openstreetmap.fr/">OpenStreetMap France</a>';

/** CARTO Voyager — day theme. Use Leaflet `{r}` for @2x on retina; do not set detectRetina (breaks max zoom). */
export const CARTO_VOYAGER_TEMPLATE =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

/** Same palette without street or building numbers (privacy before address reveal). */
export const CARTO_VOYAGER_NOLABELS_TEMPLATE =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png";

/** CARTO Dark Matter — night theme, clear lines without CSS invert. */
export const CARTO_DARK_TEMPLATE =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export function cartoTileUrlWithKey(template: string, key?: string | null) {
  const trimmed = key?.trim();
  if (!trimmed) return template;
  const sep = template.includes("?") ? "&" : "?";
  return `${template}${sep}key=${encodeURIComponent(trimmed)}`;
}

/** Watermark / “API KEY REQUIRED” stubs are ~2 KB; real CARTO tiles are much larger. */
export function cartoTileLooksValid(contentLength: number | null) {
  return contentLength !== null && contentLength > 3000;
}
