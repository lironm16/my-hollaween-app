/** CARTO Voyager — day theme, sharp @2x on retina via Leaflet `{r}`. */
export const CARTO_VOYAGER_TEMPLATE =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

/** CARTO Dark Matter — night theme, clear lines without CSS invert. */
export const CARTO_DARK_TEMPLATE =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export function cartoTileUrlWithKey(template: string, key?: string | null) {
  const trimmed = key?.trim();
  if (!trimmed) return template;
  const sep = template.includes("?") ? "&" : "?";
  return `${template}${sep}key=${encodeURIComponent(trimmed)}`;
}

/** Watermark / “key required” tiles are tiny PNGs (~100 bytes). Real tiles are much larger. */
export function cartoTileLooksValid(contentLength: number | null) {
  return contentLength !== null && contentLength > 400;
}
