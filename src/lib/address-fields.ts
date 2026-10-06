import {
  formatDisplayAddress,
  inNeighborhood,
  NEIGHBORHOODS,
  neighborhoodFromAddress,
  normalizeNeighborhoodId,
  type NeighborhoodId,
} from "@/lib/config";
import { parseStreetAndNumber } from "@/lib/address-text";
import { osmFootprintForAddress } from "@/lib/house-footprint-align";
import { clusterAddressKey } from "@/lib/house-clusters";
import { searchNamedAddressPlaces } from "@/lib/named-address-places";
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
  _lat?: number,
  _lng?: number,
): { street: string; neighborhood: NeighborhoodId | null } {
  const street = streetFromLegacyAddress(address);
  const fromText = neighborhoodFromAddress(address);
  return { street, neighborhood: fromText };
}

/** Normalize stored address fields — street only; neighborhood is owner-selected, not from pin. */
export function normalizeAddressFields(house: {
  address: string;
  neighborhood?: NeighborhoodId | null;
  lat?: number;
  lng?: number;
}): { address: string; neighborhood: NeighborhoodId | null } {
  const address = streetFromLegacyAddress(house.address);
  if (house.neighborhood !== undefined) {
    if (house.neighborhood === null) return { address, neighborhood: null };
    const normalized = normalizeNeighborhoodId(house.neighborhood);
    return { address, neighborhood: normalized ?? null };
  }
  return { address, neighborhood: neighborhoodFromAddress(house.address) };
}

export function streetFromAddressHit(hit: AddressHit): string {
  const road = hit.road.trim();
  const num = hit.houseNumber?.trim();
  if (road && num) return `${road} ${num}`;
  return streetFromLegacyAddress(hit.label);
}

/** Geocoding does not assign a hood — chosen on the house form. */
export function neighborhoodFromAddressHit(_hit: AddressHit): undefined {
  return undefined;
}

/** Street line for the address input (hood is a separate form field). */
export function displayAddressFromHit(hit: AddressHit): string {
  return streetFromAddressHit(hit);
}

/** Autocomplete line — street + city only (no calculated hood). */
export function addressAutocompleteLabel(hit: AddressHit, query = ""): string {
  const parsed = parseStreetAndNumber(query.trim());
  const queryRoad = parsed.road.trim();
  const road = queryRoad || hit.road.trim();
  const num = hit.houseNumber?.trim() || parsed.num;
  const street = road && num ? `${road} ${num}` : streetFromAddressHit(hit);
  if (/רמת\s*גן/u.test(street)) return street;
  if (inNeighborhood(hit.lat, hit.lng)) return `${street}, רמת גן`;
  return `${street}, רמת גן`;
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

/** Snap to OSM footprints and build a display label (may be outside the four neighborhoods). */
export function prepareAddressHit(hit: AddressHit, query = ""): AddressHit | null {
  if (!hit.road.trim() && !parseStreetAndNumber(query).road) return null;
  const snapped = snapHitToFootprint(hit);
  const parsed = parseStreetAndNumber(query.trim());
  const withNumber =
    parsed.num && !snapped.houseNumber ? { ...snapped, houseNumber: parsed.num } : snapped;
  return { ...withNumber, label: addressAutocompleteLabel(withNumber, query) };
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
  return prepareAddressHit(raw, query);
}

export async function searchPreparedAddresses(query: string): Promise<AddressHit[]> {
  const named = searchNamedAddressPlaces(query).map((hit) => prepareAddressHit(hit, query)).filter(Boolean) as AddressHit[];
  const { searchAddress } = await import("@/lib/geocode");
  let hits = prepareAddressHits(await searchAddress(query), query);
  if (hits.length === 0) {
    const synthetic = footprintAddressHit(query);
    if (synthetic) hits = [synthetic];
  }
  const merged = [...named];
  const seen = new Set(named.map((h) => addressHitDedupeKey(h)));
  for (const hit of hits) {
    const key = addressHitDedupeKey(hit);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(hit);
  }
  return merged;
}

export function prepareAddressHits(hits: AddressHit[], query = ""): AddressHit[] {
  const best = new Map<string, AddressHit>();
  for (const raw of hits) {
    const hit = prepareAddressHit(raw, query);
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

// re-export for tests that assert display formatting
export { formatDisplayAddress };
