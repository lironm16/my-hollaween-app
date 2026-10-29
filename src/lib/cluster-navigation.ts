import { houseServerDetailReady } from "@/lib/device-catalog-cache";
import type { PublicHouse } from "@/lib/types";

/** First cluster member with a revealed address and ready coords — for Google Maps nav. */
export function clusterMapsNavigationHouse(
  houses: readonly PublicHouse[],
  mapsAllowed: (houseId: string) => boolean,
  detailReady: (house: PublicHouse) => boolean = houseServerDetailReady,
): PublicHouse | null {
  for (const house of houses) {
    if (!house.address.trim()) continue;
    if (!mapsAllowed(house.id)) continue;
    if (!detailReady(house)) continue;
    return house;
  }
  return null;
}
