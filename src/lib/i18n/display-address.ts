import { streetFromLegacyAddress } from "@/lib/address-fields";
import { resolveNeighborhood, type NeighborhoodId } from "@/lib/config";
import type { AppLocale } from "@/lib/i18n/locale";
import { localizedStreetLine as localizedStreetLineFromLabels } from "@/lib/i18n/event-street-labels";
import { displayNeighborhoodName, localizedNeighborhoodLabel } from "@/lib/i18n/neighborhood-labels";
import { namedPlaceForCampusAddress } from "@/lib/named-address-places";

/** English labels for curated campus addresses (stored Hebrew in `address`). */
const CAMPUS_ADDRESS_EN: Record<string, string> = {
  'ביה״ס ניצנים': "Nitzanim School",
  'ביה״ס המנחיל': "HaMenachil School",
  'ביה״ס גבעולים': "Givolim School",
};

function localizedStreetLine(locale: AppLocale, street: string): string {
  const trimmed = street.trim();
  if (!trimmed || locale === "he") return trimmed;
  const place = namedPlaceForCampusAddress(trimmed);
  if (place) return CAMPUS_ADDRESS_EN[place.displayName] ?? trimmed;
  let out = localizedStreetLineFromLabels(locale, trimmed);
  const hoods: NeighborhoodId[] = ["שיכון ותיקים", "חרוזים", "נחלת גנים", "הגפן"];
  for (const id of hoods) {
    if (out.includes(id)) {
      out = out.replaceAll(id, localizedNeighborhoodLabel("en", id));
    }
  }
  return out;
}

/** Street + hood for UI — hood uses curated EN/HE labels; streets use light EN mapping when locale is English. */
export function localizedFormatDisplayAddress(
  locale: AppLocale,
  house: {
    address: string;
    neighborhood?: NeighborhoodId | null;
    lat?: number;
    lng?: number;
  },
): string {
  const street = streetFromLegacyAddress(house.address);
  const area = resolveNeighborhood(house);
  const streetLine = localizedStreetLine(locale, street);
  if (!streetLine) return area ? displayNeighborhoodName(locale, area) : "";
  if (!area) return streetLine;
  return `${streetLine}, ${displayNeighborhoodName(locale, area)}`;
}
