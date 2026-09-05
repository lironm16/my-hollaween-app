import { distanceMeters } from "@/lib/geo";
import type { PublicHouse } from "@/lib/types";

export type HouseCluster = {
  key: string;
  address: string;
  lat: number;
  lng: number;
  houses: PublicHouse[];
};

/**
 * Join separate map pins that would cover each other (~38px circles).
 * At the usual neighborhood zoom that is about this many meters.
 */
export const PIN_JOIN_METERS = 45;

/** Normalize address so "חרוזים  8, חרוזים" matches "חרוזים 8, חרוזים". */
export function normalizeAddress(address: string) {
  return address.trim().replace(/\s+/g, " ").toLowerCase();
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
    const key = normalizeAddress(house.address);
    const list = byKey.get(key);
    if (list) list.push(house);
    else byKey.set(key, [house]);
  }

  return [...byKey.entries()].map(([key, group]) => clusterFromHouses(key, group));
}

/**
 * Address groups, then merge groups that sit on top of each other on the map
 * so nearby houses become one building pin instead of overlapping circles.
 */
export function clusterHousesForMap(
  houses: PublicHouse[],
  maxDistanceMeters = PIN_JOIN_METERS,
): HouseCluster[] {
  const groups = clusterHousesByAddress(houses);
  if (groups.length <= 1) return groups;

  const parent = groups.map((_, index) => index);
  const find = (index: number): number => {
    let cursor = index;
    while (parent[cursor] !== cursor) {
      parent[cursor] = parent[parent[cursor]!]!;
      cursor = parent[cursor]!;
    }
    return cursor;
  };
  const union = (a: number, b: number) => {
    const pa = find(a);
    const pb = find(b);
    if (pa !== pb) parent[pa] = pb;
  };

  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      if (distanceMeters(groups[i]!, groups[j]!) <= maxDistanceMeters) union(i, j);
    }
  }

  const buckets = new Map<number, HouseCluster[]>();
  groups.forEach((group, index) => {
    const root = find(index);
    const list = buckets.get(root);
    if (list) list.push(group);
    else buckets.set(root, [group]);
  });

  return [...buckets.values()].map((parts) => {
    const keys = parts.map((part) => part.key).sort();
    return clusterFromHouses(keys.join("|"), parts.flatMap((part) => part.houses));
  });
}
