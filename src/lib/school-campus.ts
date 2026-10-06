import { streetFromLegacyAddress } from "@/lib/address-fields";
import {
  NAMED_ADDRESS_PLACES,
  namedPlaceForCampusAddress,
  schoolCampusNeighborhoodForAddress,
} from "@/lib/named-address-places";
import type { PublicHouse } from "@/lib/types";

export { schoolCampusNeighborhoodForAddress };

const CAMPUS_NAMES = new Set(NAMED_ADDRESS_PLACES.map((p) => p.displayName));

/** Address field equals a curated school campus (e.g. ביה״ס ניצנים). */
export function isSchoolCampusAddress(address: string | null | undefined): boolean {
  const street = streetFromLegacyAddress(address?.trim() ?? "");
  if (!street) return false;
  return CAMPUS_NAMES.has(street);
}

/** Map pin / copy — one or more rows at the same curated school address. */
export function clusterIsSchoolCampus(houses: readonly Pick<PublicHouse, "address">[]): boolean {
  if (houses.length === 0) return false;
  if (houses.length === 1) return isSchoolCampusAddress(houses[0]?.address);
  return houses.every((house) => isSchoolCampusAddress(house.address));
}

/** Cluster sheet subtitle under the address line. */
export function clusterOverviewSubtitle(houses: readonly Pick<PublicHouse, "address">[]): string {
  const count = houses.length;
  if (clusterIsSchoolCampus(houses)) {
    return count === 1 ? "דוכן אחד בבית הספר" : `${count} דוכנים בבית הספר`;
  }
  return count === 1 ? "בית בכתובת זו" : `${count} בתים בכתובת זו`;
}

/** Pin aria-label for multi-unit clusters. */
/** Map pan / cluster anchor — curated campus coords when the row is a school address. */
export function mapCoordsForHouse(
  house: Pick<PublicHouse, "address" | "lat" | "lng">,
): { lat: number; lng: number } {
  const place = namedPlaceForCampusAddress(house.address);
  if (place) return { lat: place.lat, lng: place.lng };
  return { lat: house.lat, lng: house.lng };
}

export function clusterPinAriaLabel(houses: readonly Pick<PublicHouse, "address">[]): string {
  const count = houses.length;
  if (clusterIsSchoolCampus(houses)) {
    return count === 1 ? "דוכן בבית הספר" : `${count} דוכנים בבית הספר`;
  }
  return count === 1 ? "בית" : `${count} דירות`;
}
