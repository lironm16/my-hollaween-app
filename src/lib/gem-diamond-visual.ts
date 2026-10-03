/** Open / hunt imp marker tint (map, FAB, legend). */
export const GEM_DIAMOND_FILL = "#fbbf24";
/** Found imp on map / legend / completion FAB. */
export const GEM_DIAMOND_COLLECTED_FILL = "#a78bfa";

/** Black-on-transparent mask — tinted with CSS `background-color` + mask. */
export const IMP_MARKER_MASK_URL = "/icons/imp-marker.png";

/** @deprecated Map markers use {@link IMP_MARKER_MASK_URL} mask glyph. */
export function gemDiamondSvgPath() {
  return "M6 3h12l4 7-10 13L2 10l4-7z";
}
