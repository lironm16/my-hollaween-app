import { clusterAddressKey } from "@/lib/house-clusters";
import { haversineMeters } from "@/lib/geocode";
import type { PublicHouse } from "@/lib/types";

import footprintData from "../../public/osm-building-footprints.json";

/** Skip nudging pins already this close to the OSM building footprint. */
export const FOOTPRINT_ALIGN_MIN_METERS = 4;
/** Do not snap pins farther than this — likely intentional drag or bad address. */
export const FOOTPRINT_ALIGN_MAX_METERS = 55;

type FootprintFile = {
  footprints?: Record<string, { lat: number; lng: number }>;
};

const footprints: Record<string, { lat: number; lng: number }> =
  (footprintData as FootprintFile).footprints ?? {};

export function osmFootprintForAddress(address: string) {
  const key = clusterAddressKey(address);
  if (!key.includes("#")) return null;
  const point = footprints[key];
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;
  return point;
}

export function alignPublicHouseCoords<T extends Pick<PublicHouse, "address" | "lat" | "lng">>(
  house: T,
): T {
  const footprint = osmFootprintForAddress(house.address);
  if (!footprint) return house;
  const offsetM = haversineMeters(house, footprint);
  if (offsetM < FOOTPRINT_ALIGN_MIN_METERS || offsetM > FOOTPRINT_ALIGN_MAX_METERS) {
    return house;
  }
  if (house.lat === footprint.lat && house.lng === footprint.lng) return house;
  return { ...house, lat: footprint.lat, lng: footprint.lng };
}
