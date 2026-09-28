import { parseStreetAndNumber } from "@/lib/address-text";
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

function normalizeHouseNum(num: string) {
  return num.replace(/^0+/, "").trim().toLowerCase();
}

function footprintKeysForAddress(address: string): string[] {
  const keys: string[] = [];
  const primary = clusterAddressKey(address);
  if (primary.includes("#")) keys.push(primary);

  const parsed = parseStreetAndNumber(address);
  if (!parsed.num) return keys;

  const num = normalizeHouseNum(parsed.num);
  const roadLower = parsed.road.trim().toLowerCase();
  const jabotinsky =
    /zabutinsky|jabotinsky/u.test(roadLower) || /בוטינסקי/u.test(parsed.road);
  if (jabotinsky) {
    keys.push(`זבוטינסקי#${num}`, `זאב זבוטינסקי#${num}`, `ז'בוטינסקי#${num}`);
  }

  return [...new Set(keys)];
}

export function osmFootprintForAddress(address: string) {
  for (const key of footprintKeysForAddress(address)) {
    const point = footprints[key];
    if (point && Number.isFinite(point.lat) && Number.isFinite(point.lng)) return point;
  }
  return null;
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
