import { houseSharePath } from "@/lib/nav-links";
import type { PublicHouse } from "@/lib/types";

export const VISIT_POSTER_TEMPLATE_SRC = "/images/visit-poster-template.jpg";
export const VISIT_POSTER_TEMPLATE_WIDTH = 896;
export const VISIT_POSTER_TEMPLATE_HEIGHT = 1200;
/** Paper tone of the template — covers the original title before drawing ours. */
export const VISIT_POSTER_PAPER = "#ececec";

type Box = { left: number; top: number; width: number; height: number };

/** Percent of the template image (896×1200). */
export const VISIT_POSTER_LAYOUT: { title: Box; name: Box; qr: Box } = {
  title: { left: 12.8, top: 12.2, width: 74.5, height: 8.1 },
  name: { left: 24, top: 43.5, width: 52, height: 23.5 },
  qr: { left: 37.6, top: 67.8, width: 25.2, height: 18.8 },
};

export function visitPosterPath(house: Pick<PublicHouse, "id">) {
  return `${houseSharePath(house as PublicHouse)}/poster`;
}

/** Keeps a dash on the same line as the word before it when the name wraps. */
export function visitPosterHouseName(house: Pick<PublicHouse, "name">) {
  return house.name.trim().replace(/\s+([—–-])\s+/g, "\u00a0$1 ");
}

/** Largest size in [min, max] where `fits(size)` is true (assumes fits is monotonic). */
export function fitFontSize(options: {
  min: number;
  max: number;
  fits: (size: number) => boolean;
  precision?: number;
}) {
  const precision = options.precision ?? 0.5;
  let lo = options.min;
  let hi = options.max;
  if (options.fits(hi)) return hi;
  while (hi - lo > precision) {
    const mid = (lo + hi) / 2;
    if (options.fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}
