/** Haunted campus castle — derived from product art, transparent PNG in /public/icons. */
export const PIN_SCHOOL_CAMPUS_SRC = "/icons/pin-school-campus.png";
export const PIN_SCHOOL_CAMPUS_SRC_2X = "/icons/pin-school-campus@2x.png";

/** Map cluster pin for curated school addresses (multi-booth). */
export function pinSchoolClusterIconHtml() {
  return `<span class="pin-school-clip" aria-hidden="true"><img class="pin-school-castle" src="${PIN_SCHOOL_CAMPUS_SRC}" srcset="${PIN_SCHOOL_CAMPUS_SRC} 1x, ${PIN_SCHOOL_CAMPUS_SRC_2X} 2x" width="48" height="48" alt="" decoding="async" /></span>`;
}
