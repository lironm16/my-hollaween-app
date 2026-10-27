import {
  NEIGHBORHOODS,
  NEIGHBORHOOD_FILTER_OTHER,
  type NeighborhoodFilterId,
  type NeighborhoodId,
} from "@/lib/config";
import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

const NEIGHBORHOOD_MESSAGE_KEYS: Record<NeighborhoodId, string> = {
  "שיכון ותיקים": "neighborhoods.shikunVatikim",
  חרוזים: "neighborhoods.charuzim",
  "נחלת גנים": "neighborhoods.nachlatGanim",
  הגפן: "neighborhoods.haGefen",
};

/** Canonical hood id from data (Hebrew key in config), not a display string. */
export function isNeighborhoodId(value: string | null | undefined): value is NeighborhoodId {
  return value != null && (NEIGHBORHOODS as readonly string[]).includes(value);
}

/** Official hood name for UI — curated copy in messages, never machine-translated. */
export function displayNeighborhoodName(
  locale: AppLocale,
  area: string | null | undefined,
): string {
  if (!area) return translate(locale, "stats.neighborhoodOther");
  if (isNeighborhoodId(area)) return localizedNeighborhoodLabel(locale, area);
  return area;
}

export function localizedNeighborhoodLabel(locale: AppLocale, id: NeighborhoodId): string {
  const key = NEIGHBORHOOD_MESSAGE_KEYS[id];
  return key ? translate(locale, key) : id;
}

export function localizedNeighborhoodFilterLabel(
  locale: AppLocale,
  id: NeighborhoodFilterId,
): string {
  if (id === NEIGHBORHOOD_FILTER_OTHER) return translate(locale, "stats.neighborhoodOther");
  return localizedNeighborhoodLabel(locale, id);
}

export function neighborhoodMarqueeText(locale: AppLocale): string {
  const sep = translate(locale, "neighborhoods.marqueeSeparator");
  return NEIGHBORHOODS.map((id) => localizedNeighborhoodLabel(locale, id)).join(sep);
}
