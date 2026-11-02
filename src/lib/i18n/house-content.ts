import { streetFromLegacyAddress } from "@/lib/address-fields";
import { resolveNeighborhood } from "@/lib/config";
import type { AppLocale } from "@/lib/i18n/locale";
import { displayNeighborhoodName } from "@/lib/i18n/neighborhood-labels";
import type { PublicHouse } from "@/lib/types";

type LocalizableHouse = Pick<
  PublicHouse,
  "address" | "neighborhood" | "lat" | "lng" | "i18n"
>;

/** Street line — English from server address map (`i18n.en.address`), not manual tables. */
export function localizedHouseStreetLine(house: LocalizableHouse, locale: AppLocale): string {
  if (locale === "en") {
    const en = house.i18n?.en?.address?.trim();
    if (en) return streetFromLegacyAddress(en);
  }
  return streetFromLegacyAddress(house.address);
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
