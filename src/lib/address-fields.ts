import {
  formatDisplayAddress,
  NEIGHBORHOODS,
  neighborhoodFromAddress,
  neighborhoodFromCoords,
  type NeighborhoodId,
} from "@/lib/config";
import type { AddressHit } from "@/lib/types";

const ADDRESS_AREA_NAMES = [...NEIGHBORHOODS, "הגפן"] as const;

/** Strip city / neighborhood suffixes from a legacy combined address string. */
export function streetFromLegacyAddress(address: string): string {
  let text = address.trim();
  text = text
    .replace(/,?\s*רמת\s*גן\s*$/iu, "")
    .replace(/,?\s*Ramat\s*Gan\s*$/iu, "")
    .replace(/,?\s*ישראל\s*$/iu, "")
    .trim();
  for (const name of ADDRESS_AREA_NAMES) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(`,?\\s*${escaped}\\s*$`, "u"), "").trim();
  }
  return text;
}

export function splitLegacyAddress(
  address: string,
  lat?: number,
  lng?: number,
): { street: string; neighborhood: NeighborhoodId | null } {
  const street = streetFromLegacyAddress(address);
  const fromText = neighborhoodFromAddress(address);
  const hasCoords =
    typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);
  const fromCoords = hasCoords ? neighborhoodFromCoords(lat, lng) : null;
  return { street, neighborhood: fromText ?? fromCoords };
}

/** Normalize stored address fields — split legacy combined strings on read/write. */
export function normalizeAddressFields(house: {
  address: string;
  neighborhood?: NeighborhoodId | null;
  lat?: number;
  lng?: number;
}): { address: string; neighborhood: NeighborhoodId | null } {
  if (house.neighborhood !== undefined) {
    return {
      address: streetFromLegacyAddress(house.address),
      neighborhood: house.neighborhood,
    };
  }
  const split = splitLegacyAddress(house.address, house.lat, house.lng);
  return { address: split.street, neighborhood: split.neighborhood };
}

export function streetFromAddressHit(hit: AddressHit): string {
  const road = hit.road.trim();
  const num = hit.houseNumber?.trim();
  if (road && num) return `${road} ${num}`;
  return streetFromLegacyAddress(hit.label);
}

export function neighborhoodFromAddressHit(hit: AddressHit): NeighborhoodId | null {
  const suburb = hit.suburb?.trim() ?? "";
  if (suburb && (NEIGHBORHOODS as readonly string[]).includes(suburb)) {
    return suburb as NeighborhoodId;
  }
  return neighborhoodFromCoords(hit.lat, hit.lng);
}

/** Street + neighborhood for the address input after pin drag or autocomplete pick. */
export function displayAddressFromHit(hit: AddressHit): string {
  return formatDisplayAddress({
    address: streetFromAddressHit(hit),
    neighborhood: neighborhoodFromAddressHit(hit),
    lat: hit.lat,
    lng: hit.lng,
  });
}
