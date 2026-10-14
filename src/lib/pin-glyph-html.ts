/** Build a map/legend glyph: brand fill (#6d28d9 / #f97316) with black eyes/mouth from the PNG. */

export type PinGlyphKind = "house" | "poi" | "cluster-houses" | "cluster-businesses";

function maskUrl(src: string) {
  return src.replace(/'/g, "%27");
}

export function pinGlyphClass(kind: PinGlyphKind): string {
  switch (kind) {
    case "poi":
      return "pin-glyph pin-glyph-poi";
    case "cluster-houses":
      return "pin-glyph pin-glyph-cluster-houses";
    case "cluster-businesses":
      return "pin-glyph pin-glyph-cluster-businesses";
    default:
      return "pin-glyph pin-glyph-house";
  }
}

export function pinGlyphHtml(src: string, kind: PinGlyphKind, srcAttr?: string): string {
  const safe = maskUrl(src);
  const imgSrc = srcAttr ?? src.replace(/"/g, "&quot;").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<span class="pin-glyph-stack" aria-hidden="true"><span class="${pinGlyphClass(kind)}" style="--pin-glyph-mask:url('${safe}')"></span><img class="pin-glyph-faces" src="${imgSrc}" alt="" decoding="async" /></span>`;
}
