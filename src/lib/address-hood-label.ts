import { neighborhoodAtEventLocation, type NeighborhoodId } from "@/lib/config";
import { streetFromAddressHit } from "@/lib/address-fields";
import { schoolCampusNeighborhoodForAddress } from "@/lib/named-address-places";
import type { AddressHit } from "@/lib/types";

export function hoodIdForAddressHit(hit: AddressHit): NeighborhoodId | null {
  const address = streetFromAddressHit(hit);
  return (
    schoolCampusNeighborhoodForAddress(address) ?? neighborhoodAtEventLocation(hit.lat, hit.lng)
  );
}

export function hoodSubtitleForAddressHit(hit: AddressHit): string | undefined {
  const hood = hoodIdForAddressHit(hit);
  return hood ? `שכונה: ${hood}` : undefined;
}
