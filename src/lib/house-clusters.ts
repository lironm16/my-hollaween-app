import { boothNumberForHouse } from "@/lib/cluster-booth";
import { parseStreetAndNumber } from "@/lib/address-text";
import { namedPlaceForCampusAddress } from "@/lib/named-address-places";
import { clusterIsSchoolCampus } from "@/lib/school-campus";
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

/** Map pin grouping — per-house when address is redacted (empty street text). */
export function clusterAddressKeyForHouse(house: Pick<PublicHouse, "id" | "address">) {
  const trimmed = house.address?.trim() ?? "";
  if (!trimmed) return `id:${house.id}`;
  return clusterAddressKey(trimmed);
}

function sortHouses(houses: PublicHouse[]) {
  return [...houses].sort((a, b) => {
    const an = boothNumberForHouse(a);
    const bn = boothNumberForHouse(b);
    if (an != null && bn != null && an !== bn) return an - bn;
    if (an != null && bn == null) return -1;
    if (an == null && bn != null) return 1;
    const created = a.createdAt.localeCompare(b.createdAt);
    if (created !== 0) return created;
    return (a.arrival || a.name).localeCompare(b.arrival || b.name, "he");
  });
}

function clusterFromHouses(key: string, houses: PublicHouse[]): HouseCluster {
  const housesSorted = sortHouses(houses);
  const campusPlace = clusterIsSchoolCampus(housesSorted)
    ? namedPlaceForCampusAddress(housesSorted[0]!.address)
    : null;
  const lat =
    campusPlace?.lat ??
    housesSorted.reduce((sum, h) => sum + h.lat, 0) / housesSorted.length;
  const lng =
    campusPlace?.lng ??
    housesSorted.reduce((sum, h) => sum + h.lng, 0) / housesSorted.length;
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
    const key = clusterAddressKeyForHouse(house);
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

/** Max apartment status badges on a multi-house building pin. */
export const MAX_CLUSTER_BADGE_DOTS = 3;

/** Apartments sharing a pin with the given house (from the supplied house list only). */
export function clusterMembersForHouse(houses: PublicHouse[], houseId: string): PublicHouse[] {
  const cluster = clusterHousesByAddress(houses).find((item) =>
    item.houses.some((house) => house.id === houseId),
  );
  return cluster?.houses ?? houses.filter((house) => house.id === houseId);
}

/** Status badge dots for a building pin — same members as the cluster, capped for display. */
export function clusterBadgeHouses(houses: PublicHouse[], max = MAX_CLUSTER_BADGE_DOTS): PublicHouse[] {
  return houses.slice(0, max);
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
