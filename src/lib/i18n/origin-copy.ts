import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

const LEGACY_GPS_LABELS = new Set(["מיקום נוכחי"]);
const LEGACY_NEIGHBORHOOD_LABELS = new Set(["ממרכז השכונה"]);
const LEGACY_CUSTOM_LABELS = new Set(["מנקודה במפה", "נקודה במפה"]);

/** Route / list start point — ignores stale Hebrew labels saved on older routes. */
export function localizedRouteOriginLabel(
  locale: AppLocale,
  startedFrom: "gps" | "neighborhood" | "custom" | undefined,
  storedLabel?: string,
): string {
  const label = storedLabel?.trim() ?? "";
  if (startedFrom === "gps") return translate(locale, "routeList.currentLocation");
  if (startedFrom === "neighborhood") return translate(locale, "routeList.fromNeighborhood");
  if (startedFrom === "custom") {
    if (!label || LEGACY_CUSTOM_LABELS.has(label)) {
      return translate(locale, "originPicker.pickOnMap");
    }
    return label;
  }
  if (LEGACY_GPS_LABELS.has(label)) return translate(locale, "routeList.currentLocation");
  if (LEGACY_NEIGHBORHOOD_LABELS.has(label)) return translate(locale, "routeList.fromNeighborhood");
  if (label) return label;
  return translate(locale, "routeList.fromNeighborhood");
}
