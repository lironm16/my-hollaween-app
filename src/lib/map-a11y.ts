import {
  formatDisplayAddressWithPolicy,
  makeAddressRevealContext,
  type AddressRevealContext,
} from "@/lib/address-reveal";
import { visitLabels } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";

export function houseSelectionAnnouncement(
  house: PublicHouse,
  reveal?: AddressRevealContext,
): string {
  const ctx = reveal ?? makeAddressRevealContext({ now: new Date(), isAdmin: true });
  const address = formatDisplayAddressWithPolicy(house, house.id, ctx);
  const visit = visitLabels[house.visit] ?? house.visit;
  return `נבחר: ${house.name}, ${address}. ${visit}`;
}
