import { displayAddressFromHit } from "@/lib/address-fields";
import { localizedFormatDisplayAddress } from "@/lib/i18n/display-address";
import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";
import type { AddressHit } from "@/lib/types";

const LEGACY_GPS_LABELS = new Set(["מיקום נוכחי"]);
const LEGACY_NEIGHBORHOOD_LABELS = new Set(["ממרכז השכונה"]);
const LEGACY_CUSTOM_LABELS = new Set(["מנקודה במפה", "נקודה במפה"]);

function localizedStoredCustomAddressLabel(locale: AppLocale, storedLabel: string): string {
  const label = storedLabel.trim();
  if (!label || LEGACY_CUSTOM_LABELS.has(label)) {
    return translate(locale, "originPicker.pickOnMap");
  }
  if (locale === "he") return label;
  return localizedFormatDisplayAddress(locale, { address: label });
}

/** Reverse-geocode line while dragging the map origin pin. */
export function localizedReversePinOriginLabel(locale: AppLocale, hit: AddressHit): string {
  if (locale === "he") return hit.label;
  const street = displayAddressFromHit(hit);
  return localizedFormatDisplayAddress(locale, {
    address: street,
    lat: hit.lat,
    lng: hit.lng,
  });
}

/** Saved custom origin — canonical Hebrew in storage, localized for display. */
export function localizedCustomOriginLabel(locale: AppLocale, storedLabel: string): string {
  return localizedStoredCustomAddressLabel(locale, storedLabel);
}

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
    return localizedStoredCustomAddressLabel(locale, label);
  }
  if (LEGACY_GPS_LABELS.has(label)) return translate(locale, "routeList.currentLocation");
  if (LEGACY_NEIGHBORHOOD_LABELS.has(label)) return translate(locale, "routeList.fromNeighborhood");
  if (label) return localizedStoredCustomAddressLabel(locale, label);
  return translate(locale, "routeList.fromNeighborhood");
}
