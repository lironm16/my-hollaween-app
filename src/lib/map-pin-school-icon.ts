/** Haunted campus castle — product PNG in /public/icons. */
export const PIN_SCHOOL_CAMPUS_SRC = "/icons/pin-school-campus.png";
export const PIN_SCHOOL_CAMPUS_SRC_2X = "/icons/pin-school-campus@2x.png";

export type SchoolPinVariant = "castle-png" | "castle-svg" | "twin-homes" | "emoji-campus";

const VALID_VARIANTS = new Set<SchoolPinVariant>([
  "castle-png",
  "castle-svg",
  "twin-homes",
  "emoji-campus",
]);

/** Default map pin art — override with NEXT_PUBLIC_SCHOOL_PIN_VARIANT on Vercel. */
export const DEFAULT_SCHOOL_PIN_VARIANT: SchoolPinVariant = "castle-png";

export function resolveSchoolPinVariant(raw?: string | null): SchoolPinVariant {
  const value = raw?.trim() as SchoolPinVariant | undefined;
  if (value && VALID_VARIANTS.has(value)) return value;
  return DEFAULT_SCHOOL_PIN_VARIANT;
}

export function activeSchoolPinVariant(): SchoolPinVariant {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SCHOOL_PIN_VARIANT) {
    return resolveSchoolPinVariant(process.env.NEXT_PUBLIC_SCHOOL_PIN_VARIANT);
  }
  return DEFAULT_SCHOOL_PIN_VARIANT;
}

function twinHomesSvgHtml() {
  return `<span class="pin-cluster-icon pin-school-twin" aria-hidden="true"><svg viewBox="0 0 32 28" width="32" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="12" width="13" height="15" rx="1.5" fill="#ffedd5"/><path d="M1 12 L7.5 5.5 L14 12 Z" fill="#ffedd5"/><rect x="14" y="8" width="13" height="19" rx="1.5" fill="#fb923c"/><path d="M14 8 L20.5 1.5 L27 8 Z" fill="#fb923c"/></svg></span>`;
}

function castleSvgHtml() {
  return `<span class="pin-school-art" aria-hidden="true"><svg class="pin-school-castle-svg" viewBox="0 0 40 34" width="40" height="34" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="#ffedd5" stroke="#431407" stroke-width="1.1" d="M20 3 28 11v4h3v16H9V15h3v-4l8-8Z"/><path fill="#ffedd5" stroke="#431407" stroke-width="1" d="M16 27h8v4h-8z"/><rect fill="#1c1917" x="12.5" y="17" width="4.5" height="5.5" rx="0.6"/><rect fill="#1c1917" x="23" y="17" width="4.5" height="5.5" rx="0.6"/><rect fill="#1c1917" x="17.5" y="21" width="5" height="6" rx="0.6"/></svg></span>`;
}

function castlePngHtml() {
  return `<span class="pin-school-art" aria-hidden="true"><img class="pin-school-castle-img" src="${PIN_SCHOOL_CAMPUS_SRC}" srcset="${PIN_SCHOOL_CAMPUS_SRC} 1x, ${PIN_SCHOOL_CAMPUS_SRC_2X} 2x" width="48" height="40" alt="" decoding="async" /></span>`;
}

function emojiCampusHtml() {
  return `<span class="pin-school-art pin-school-emoji-wrap" aria-hidden="true"><span class="pin-school-emoji">🏫</span></span>`;
}

/** Map cluster pin for curated school addresses (multi-booth or single booth). */
export function pinSchoolClusterIconHtml(variant: SchoolPinVariant = activeSchoolPinVariant()) {
  switch (variant) {
    case "castle-svg":
      return castleSvgHtml();
    case "twin-homes":
      return twinHomesSvgHtml();
    case "emoji-campus":
      return emojiCampusHtml();
    case "castle-png":
    default:
      return castlePngHtml();
  }
}

export const SCHOOL_PIN_VARIANT_LABELS: Record<
  SchoolPinVariant,
  { title: string; note: string }
> = {
  "castle-png": {
    title: "טירה (PNG)",
    note: "איור המוצר המקורי — מוקטן בתוך העיגול הסגול",
  },
  "castle-svg": {
    title: "טירה (SVG)",
    note: "גרסה וקטורית פשוטה — חלונות שחורים",
  },
  "twin-homes": {
    title: "שני בתים",
    note: "כמו בניין רגיל — לבחירה אם הטירה לא מתאימה",
  },
  "emoji-campus": {
    title: "אימוג׳ בית ספר",
    note: "זמני / השוואה",
  },
};
