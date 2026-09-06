import { parseStreetAndNumber } from "@/lib/address-text";
import type { PublicHouse } from "@/lib/types";

export type HouseCluster = {
  key: string;
  address: string;
  lat: number;
  lng: number;
  houses: PublicHouse[];
};

/** Normalize address so "חרוזים  8, חרוזים" matches "חרוזים 8, חרוזים". */
export function normalizeAddress(address: string) {
  return address.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeRoad(road: string) {
  return road
    .replace(/^רחוב\s+/u, "")
    .replace(/^שדרות\s+/u, "")
    .replace(/["״׳'"`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeHouseNumber(num: string) {
  return num.replace(/^0+/, "").trim().toLowerCase();
}

/**
 * Same building even when the geocoder stores "חרוזים 8" vs "חרוזים 8, חרוזים"
 * or "8 חרוזים". Apartments share this key; different street numbers do not.
 */
export function clusterAddressKey(address: string) {
  const parsed = parseStreetAndNumber(address);
  const road = normalizeRoad(parsed.road);
  const num = parsed.num ? normalizeHouseNumber(parsed.num) : "";
  if (road && num) return `${road}#${num}`;
  return normalizeAddress(address);
}

function sortHouses(houses: PublicHouse[]) {
  return [...houses].sort((a, b) =>
    (a.arrival || a.name).localeCompare(b.arrival || b.name, "he"),
  );
}

function clusterFromHouses(key: string, houses: PublicHouse[]): HouseCluster {
  const housesSorted = sortHouses(houses);
  const lat = housesSorted.reduce((sum, h) => sum + h.lat, 0) / housesSorted.length;
  const lng = housesSorted.reduce((sum, h) => sum + h.lng, 0) / housesSorted.length;
  return {
    key,
    address: housesSorted[0]!.address,
    lat,
    lng,
    houses: housesSorted,
  };
}

/** Group houses that share the same street address into one map pin. */
export function clusterHousesByAddress(houses: PublicHouse[]): HouseCluster[] {
  const byKey = new Map<string, PublicHouse[]>();
  for (const house of houses) {
    const key = clusterAddressKey(house.address);
    const list = byKey.get(key);
    if (list) list.push(house);
    else byKey.set(key, [house]);
  }

  return [...byKey.entries()].map(([key, group]) => clusterFromHouses(key, group));
}

/**
 * Group houses that share the same street address into one map pin.
 * Nearby houses on a different address keep their own pin.
 */
export function clusterHousesForMap(houses: PublicHouse[]): HouseCluster[] {
  return clusterHousesByAddress(houses);
}

/** Reuse the label already stored for this building so a new apartment joins the pin. */
export function canonicalAddressForBuilding<T extends { address: string }>(
  address: string,
  existing: T[],
): string {
  const key = clusterAddressKey(address);
  if (!key.includes("#")) return address;
  const match = existing.find((house) => clusterAddressKey(house.address) === key);
  return match?.address ?? address;
}
