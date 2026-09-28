import {
  formatDisplayAddress,
  houseLocationAllowed,
  NEIGHBORHOODS,
  neighborhoodAtEventLocation,
  neighborhoodFromAddress,
  normalizeNeighborhoodId,
  type NeighborhoodId,
} from "@/lib/config";
import { parseStreetAndNumber } from "@/lib/address-text";
import { osmFootprintForAddress } from "@/lib/house-footprint-align";
import { clusterAddressKey } from "@/lib/house-clusters";
import type { AddressHit } from "@/lib/types";

const ADDRESS_AREA_NAMES = [...NEIGHBORHOODS, "שכונת הגפן"] as const;

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
  const fromCoords = hasCoords ? neighborhoodAtEventLocation(lat, lng) : null;
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
      neighborhood: normalizeNeighborhoodId(house.neighborhood) ?? house.neighborhood,
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
  return neighborhoodAtEventLocation(hit.lat, hit.lng);
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

function snapHitToFootprint(hit: AddressHit): AddressHit {
  const street = streetFromAddressHit(hit);
  const footprint = osmFootprintForAddress(street);
  if (!footprint) return hit;
  return {
    ...hit,
    lat: footprint.lat,
    lng: footprint.lng,
    precise: true,
  };
}

/** Snap to OSM footprints, relabel by map neighborhood, drop hits outside the four areas. */
export function prepareAddressHit(hit: AddressHit): AddressHit | null {
  const snapped = snapHitToFootprint(hit);
  if (!houseLocationAllowed(snapped.lat, snapped.lng)) return null;
  return { ...snapped, label: displayAddressFromHit(snapped) };
}

function addressHitDedupeKey(hit: AddressHit) {
  const street = streetFromAddressHit(hit);
  const footprint = osmFootprintForAddress(street);
  if (footprint) {
    return `fp#${footprint.lat.toFixed(5)}#${footprint.lng.toFixed(5)}#${hit.houseNumber ?? ""}`;
  }
  return clusterAddressKey(street);
}

/** Build a verified hit from a known OSM footprint when geocoders return nothing. */
export function footprintAddressHit(query: string): AddressHit | null {
  const parsed = parseStreetAndNumber(query.trim());
  if (!parsed.num) return null;
  const street = `${parsed.road} ${parsed.num}`.trim();
  const footprint = osmFootprintForAddress(street);
  if (!footprint) return null;
  const raw: AddressHit = {
    id: `footprint-${clusterAddressKey(street)}`,
    label: street,
    lat: footprint.lat,
    lng: footprint.lng,
    road: parsed.road,
    houseNumber: parsed.num,
    city: "רמת גן",
    precise: true,
  };
  return prepareAddressHit(raw);
}

export async function searchPreparedAddresses(query: string): Promise<AddressHit[]> {
  const { searchAddress } = await import("@/lib/geocode");
  let hits = prepareAddressHits(await searchAddress(query));
  if (hits.length === 0) {
    const synthetic = footprintAddressHit(query);
    if (synthetic) hits = [synthetic];
  }
  return hits;
}

export function prepareAddressHits(hits: AddressHit[]): AddressHit[] {
  const best = new Map<string, AddressHit>();
  for (const raw of hits) {
    const hit = prepareAddressHit(raw);
    if (!hit) continue;
    const key = addressHitDedupeKey(hit);
    const prev = best.get(key);
    if (!prev || (hit.precise && !prev.precise)) {
      best.set(key, hit);
      continue;
    }
    if (hit.precise === prev.precise && hit.label.length < prev.label.length) {
      best.set(key, hit);
    }
  }
  return [...best.values()];
}
