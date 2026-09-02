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

/** Group houses that share the same street address into one map pin. */
export function clusterHousesByAddress(houses: PublicHouse[]): HouseCluster[] {
  const byKey = new Map<string, PublicHouse[]>();
  for (const house of houses) {
    const key = normalizeAddress(house.address);
    const list = byKey.get(key);
    if (list) list.push(house);
    else byKey.set(key, [house]);
  }

  return [...byKey.entries()].map(([key, group]) => {
    const lat = group.reduce((sum, h) => sum + h.lat, 0) / group.length;
    const lng = group.reduce((sum, h) => sum + h.lng, 0) / group.length;
    const housesSorted = [...group].sort((a, b) =>
      (a.arrival || a.name).localeCompare(b.arrival || b.name, "he"),
    );
    return {
      key,
      address: housesSorted[0].address,
      lat,
      lng,
      houses: housesSorted,
    };
  });
}
