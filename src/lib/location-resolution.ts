import { streetFromAddressHit } from "@/lib/address-fields";
import { namedPlaceForCampusAddress } from "@/lib/named-address-places";
import type { AddressHit } from "@/lib/types";

export type LocationResolution = {
  sourceId: string;
  lat: number;
  lng: number;
  addressHe: string;
  addressEn: string;
  precise: boolean;
};

const CAMPUS_ADDRESS_EN: Record<string, string> = {
  'ביה״ס ניצנים': "Nitzanim School",
  'ביה״ס המנחיל': "HaMenachil School",
  'ביה״ס גבעולים': "Givolim School",
};

export function campusAddressEn(he: string): string | null {
  const place = namedPlaceForCampusAddress(he);
  if (!place) return null;
  return CAMPUS_ADDRESS_EN[place.displayName] ?? null;
}

/** Build HE/EN street lines on a prepared hit (EN may equal HE until enriched). */
export function linesFromPreparedHit(hit: AddressHit): { addressHe: string; addressEn: string } {
  const addressHe = streetFromAddressHit(hit);
  const campusEn = campusAddressEn(addressHe);
  const addressEn = hit.addressEn?.trim() || campusEn || hit.addressHe?.trim() || addressHe;
  return { addressHe, addressEn };
}

export function locationResolutionFromHit(hit: AddressHit): LocationResolution {
  const { addressHe, addressEn } = linesFromPreparedHit(hit);
  return {
    sourceId: hit.id,
    lat: hit.lat,
    lng: hit.lng,
    addressHe,
    addressEn,
    precise: hit.precise,
  };
}

