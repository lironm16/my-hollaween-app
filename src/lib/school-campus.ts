import { streetFromLegacyAddress } from "@/lib/address-fields";
import {
  NAMED_ADDRESS_PLACES,
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

/** Multi-house pin at one school address — show school icon instead of apartment towers. */
export function clusterIsSchoolCampus(houses: readonly Pick<PublicHouse, "address">[]): boolean {
  if (houses.length <= 1) return isSchoolCampusAddress(houses[0]?.address);
  return houses.every((house) => isSchoolCampusAddress(house.address));
}
