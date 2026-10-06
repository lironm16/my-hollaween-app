/** Haunted campus castle — derived from product art in /public/icons. */
export const PIN_SCHOOL_CAMPUS_SRC = "/icons/pin-school-campus.png";
export const PIN_SCHOOL_CAMPUS_SRC_2X = "/icons/pin-school-campus@2x.png";
export const PIN_SCHOOL_CAMPUS_LIGHT_SRC = "/icons/pin-school-campus-light.png";
export const PIN_SCHOOL_CAMPUS_LIGHT_SRC_2X = "/icons/pin-school-campus-light@2x.png";
export const PIN_SCHOOL_CAMPUS_INK_SRC = "/icons/pin-school-campus-ink.png";
export const PIN_SCHOOL_CAMPUS_INK_SRC_2X = "/icons/pin-school-campus-ink@2x.png";

export type SchoolPinVariant =
  | "castle-light"
  | "castle-ink"
  | "castle-original"
  | "castle-svg"
  | "twin-homes";

const VALID_VARIANTS = new Set<SchoolPinVariant>([
  "castle-light",
  "castle-ink",
  "castle-original",
  "castle-svg",
  "twin-homes",
]);

/** Default — cream castle + black windows (from your PNG, fits purple pin). */
export const DEFAULT_SCHOOL_PIN_VARIANT: SchoolPinVariant = "castle-light";

export function resolveSchoolPinVariant(raw?: string | null): SchoolPinVariant {
  const trimmed = raw?.trim();
  if (trimmed === "castle-png") return "castle-original";
  const value = trimmed as SchoolPinVariant | undefined;
  if (value && VALID_VARIANTS.has(value)) return value;
  return DEFAULT_SCHOOL_PIN_VARIANT;
}

export function activeSchoolPinVariant(): SchoolPinVariant {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SCHOOL_PIN_VARIANT) {
    return resolveSchoolPinVariant(process.env.NEXT_PUBLIC_SCHOOL_PIN_VARIANT);
  }
  return DEFAULT_SCHOOL_PIN_VARIANT;
}

function imgCastleHtml(src: string, src2x: string, className: string) {
  return `<span class="pin-school-art" aria-hidden="true"><img class="pin-school-castle-img ${className}" src="${src}" srcset="${src} 1x, ${src2x} 2x" width="48" height="40" alt="" decoding="async" /></span>`;
}

function twinHomesSvgHtml() {
  return `<span class="pin-cluster-icon pin-school-twin" aria-hidden="true"><svg viewBox="0 0 32 28" width="32" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="12" width="13" height="15" rx="1.5" fill="#ffedd5"/><path d="M1 12 L7.5 5.5 L14 12 Z" fill="#ffedd5"/><rect x="14" y="8" width="13" height="19" rx="1.5" fill="#fb923c"/><path d="M14 8 L20.5 1.5 L27 8 Z" fill="#fb923c"/></svg></span>`;
}

function castleSvgHtml() {
  return `<span class="pin-school-art" aria-hidden="true"><svg class="pin-school-castle-svg" viewBox="0 0 40 34" width="40" height="34" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="#fff7ed" stroke="#431407" stroke-width="1.1" d="M20 3 28 11v4h3v16H9V15h3v-4l8-8Z"/><path fill="#fff7ed" stroke="#431407" stroke-width="1" d="M16 27h8v4h-8z"/><rect fill="#1c1917" x="12.5" y="17" width="4.5" height="5.5" rx="0.6"/><rect fill="#1c1917" x="23" y="17" width="4.5" height="5.5" rx="0.6"/><rect fill="#1c1917" x="17.5" y="21" width="5" height="6" rx="0.6"/></svg></span>`;
}

/** Map cluster pin for curated school addresses (multi-booth or single booth). */
export function pinSchoolClusterIconHtml(variant: SchoolPinVariant = activeSchoolPinVariant()) {
  switch (variant) {
    case "castle-original":
      return imgCastleHtml(PIN_SCHOOL_CAMPUS_SRC, PIN_SCHOOL_CAMPUS_SRC_2X, "is-original");
    case "castle-ink":
      return imgCastleHtml(PIN_SCHOOL_CAMPUS_INK_SRC, PIN_SCHOOL_CAMPUS_INK_SRC_2X, "is-ink");
    case "castle-light":
      return imgCastleHtml(PIN_SCHOOL_CAMPUS_LIGHT_SRC, PIN_SCHOOL_CAMPUS_LIGHT_SRC_2X, "is-light");
    case "castle-svg":
      return castleSvgHtml();
    case "twin-homes":
      return twinHomesSvgHtml();
    default:
      return imgCastleHtml(PIN_SCHOOL_CAMPUS_LIGHT_SRC, PIN_SCHOOL_CAMPUS_LIGHT_SRC_2X, "is-light");
  }
}

export type SchoolPinAssetPreview = {
  variant: SchoolPinVariant;
  title: string;
  note: string;
  /** Full-size PNG for side-by-side comparison (undefined for SVG-only). */
  assetSrc?: string;
  assetSrc2x?: string;
};

export const SCHOOL_PIN_VARIANT_PREVIEWS: readonly SchoolPinAssetPreview[] = [
  {
    variant: "castle-light",
    title: "טירה — קרם + חלונות שחורים",
    note: "נגזר מהאיור שלך · ברירת מחדל במפה",
    assetSrc: PIN_SCHOOL_CAMPUS_LIGHT_SRC,
    assetSrc2x: PIN_SCHOOL_CAMPUS_LIGHT_SRC_2X,
  },
  {
    variant: "castle-ink",
    title: "טירה — לבן + חלונות שחורים",
    note: "נגזר מהאיור שלך · ניגודיות גבוהה",
    assetSrc: PIN_SCHOOL_CAMPUS_INK_SRC,
    assetSrc2x: PIN_SCHOOL_CAMPUS_INK_SRC_2X,
  },
  {
    variant: "castle-original",
    title: "טירה — מקור (שחור + חלונות זהובים)",
    note: "הקובץ המקורי שהעלית",
    assetSrc: PIN_SCHOOL_CAMPUS_SRC,
    assetSrc2x: PIN_SCHOOL_CAMPUS_SRC_2X,
  },
  {
    variant: "castle-svg",
    title: "טירה — SVG פשוט",
    note: "גיבוי וקטורי (לא מהקובץ)",
  },
  {
    variant: "twin-homes",
    title: "שני בתים (בניין)",
    note: "להשוואה — לא טירה",
  },
];
