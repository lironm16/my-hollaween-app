import { neighborhoodAtEventLocation, type NeighborhoodId } from "@/lib/config";
import { houseNumberFromHit } from "@/lib/address-text";
import { streetFromAddressHit } from "@/lib/address-fields";
import { schoolCampusNeighborhoodForAddress } from "@/lib/named-address-places";
import type { AddressHit } from "@/lib/types";

function isCuratedAddressHit(hit: AddressHit) {
  return hit.id.startsWith("named-place-");
}

export function hoodIdForAddressHit(hit: AddressHit): NeighborhoodId | null {
  const address = streetFromAddressHit(hit);
  return (
    schoolCampusNeighborhoodForAddress(address) ?? neighborhoodAtEventLocation(hit.lat, hit.lng)
  );
}

/** Hood subtitle only after a house number (or curated campus pick). Requires precise pin for streets. */
export function hoodSubtitleForAddressHit(hit: AddressHit, query = ""): string | undefined {
  const curated = isCuratedAddressHit(hit);
  if (!curated && !houseNumberFromHit(hit, query)) return undefined;
  if (!curated && !hit.precise) return undefined;
  const hood = hoodIdForAddressHit(hit);
  return hood ? `שכונה: ${hood}` : undefined;
}
