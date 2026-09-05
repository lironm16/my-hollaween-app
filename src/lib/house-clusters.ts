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
<<<<<<< HEAD
=======

/**
 * Group houses that share the same street address into one map pin.
 * Nearby houses on a different address keep their own pin.
 */
export function clusterHousesForMap(houses: PublicHouse[]): HouseCluster[] {
  return clusterHousesByAddress(houses);
}
>>>>>>> 8f9c09c (Show the multi-house pin only for the same address)
