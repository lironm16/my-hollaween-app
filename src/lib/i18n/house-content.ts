import { streetFromLegacyAddress } from "@/lib/address-fields";
import { resolveNeighborhood } from "@/lib/config";
import type { AppLocale } from "@/lib/i18n/locale";
import { displayNeighborhoodName } from "@/lib/i18n/neighborhood-labels";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";

type LocalizableHouse = Pick<
  PublicHouse,
  "address" | "name" | "description" | "arrival" | "notes" | "neighborhood" | "lat" | "lng" | "i18n"
>;

function enSnapshot(house: LocalizableHouse) {
  return house.i18n?.en;
}

/** Display name — English snapshot when locale is en (fallback: Hebrew primary). */
export function localizedHouseName(house: LocalizableHouse, locale: AppLocale): string {
  if (locale === "en") {
    const en = enSnapshot(house)?.name?.trim();
    if (en) return en;
  }
  return house.name;
}

export function localizedHouseDescription(house: LocalizableHouse, locale: AppLocale): string {
  if (locale === "en") {
    const en = enSnapshot(house)?.description?.trim();
    if (en) return en;
  }
  return house.description;
}

export function localizedHouseArrival(house: LocalizableHouse, locale: AppLocale): string {
  if (locale === "en") {
    const en = enSnapshot(house)?.arrival?.trim();
    if (en) return en;
  }
  return house.arrival;
}

export function localizedHouseNotes(house: LocalizableHouse, locale: AppLocale): string {
  if (locale === "en") {
    const en = enSnapshot(house)?.notes?.trim();
    if (en) return en;
  }
  return house.notes;
}

/** Street line for maps/cards — uses stored English address snapshot, not manual maps. */
export function localizedHouseStreetLine(house: LocalizableHouse, locale: AppLocale): string {
  if (locale === "en") {
    const en = enSnapshot(house)?.address?.trim();
    if (en) return streetFromLegacyAddress(en);
  }
  return streetFromLegacyAddress(house.address);
}

export function localizedHouseHeadline(house: LocalizableHouse, locale: AppLocale): string {
  return houseHeadline({ ...house, name: localizedHouseName(house, locale) });
}

export function localizedFormatDisplayAddress(
  locale: AppLocale,
  house: LocalizableHouse,
): string {
  const streetLine = localizedHouseStreetLine(house, locale);
  const area = resolveNeighborhood(house);
  if (!streetLine) return area ? displayNeighborhoodName(locale, area) : "";
  if (!area) return streetLine;
  return `${streetLine}, ${displayNeighborhoodName(locale, area)}`;
}
