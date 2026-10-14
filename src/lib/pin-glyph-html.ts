/** Build a map/legend glyph colored with exact brand purple/orange (former pin disc fills). */

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

export function pinGlyphHtml(src: string, kind: PinGlyphKind): string {
  const safe = maskUrl(src);
  return `<span class="${pinGlyphClass(kind)}" style="--pin-glyph-mask:url('${safe}')" aria-hidden="true"></span>`;
}
