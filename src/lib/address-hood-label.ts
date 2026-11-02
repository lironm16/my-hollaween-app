import { neighborhoodAtEventLocation, type NeighborhoodId } from "@/lib/config";
import { houseNumberFromHit } from "@/lib/address-text";
import { streetFromAddressHit } from "@/lib/address-fields";
import type { AddressHit } from "@/lib/types";

function isCuratedAddressHit(hit: AddressHit) {
  return hit.id.startsWith("google-place-");
}

export function hoodIdForAddressHit(hit: AddressHit): NeighborhoodId | null {
  return neighborhoodAtEventLocation(hit.lat, hit.lng);
}

/** Hood subtitle only after a house number (or curated campus pick). Requires precise pin for streets. */
export function hoodSubtitleForAddressHit(hit: AddressHit, query = ""): string | undefined {
  const curated = isCuratedAddressHit(hit);
  if (!curated && !houseNumberFromHit(hit, query)) return undefined;
  if (!curated && !hit.precise) return undefined;
  const hood = hoodIdForAddressHit(hit);
  return hood ? `שכונה: ${hood}` : undefined;
}
