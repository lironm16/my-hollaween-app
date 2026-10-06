/** Open / hunt imp marker tint (map, FAB, legend). */
export const GEM_DIAMOND_FILL = "#fbbf24";
/** Found imp on map / legend / completion FAB. */
export const GEM_DIAMOND_COLLECTED_FILL = "#a78bfa";

/** Legacy SW precache assets (UI uses vector {@link ImpDemonFilledIcon} / outline). */
export const IMP_MARKER_MASK_URL = "/icons/imp-marker.png";
export const IMP_MARKER_EYES_MASK_URL = "/icons/imp-marker-eyes.png";

/** @deprecated Gem UI uses SVG demon glyphs, not diamond path. */
export function gemDiamondSvgPath() {
  return "M6 3h12l4 7-10 13L2 10l4-7z";
}
