import { clusterAddressKey } from "@/lib/house-clusters";
import { clusterIsSchoolCampus } from "@/lib/school-campus";
import type { PublicHouse } from "@/lib/types";

export function boothNumberForHouse(
  house: Pick<PublicHouse, "boothNumber">,
): number | null {
  const raw = house.boothNumber;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 1) return null;
  return Math.floor(raw);
}

/** Next serial at this address — never reuses numbers when a booth was removed. */
export function nextBoothNumberForAddress(
  houses: readonly Pick<PublicHouse, "address" | "boothNumber" | "deletedAt">[],
  address: string,
): number {
  const key = clusterAddressKey(address.trim());
  let max = 0;
  for (const house of houses) {
    if (house.deletedAt) continue;
    if (clusterAddressKey(house.address?.trim() ?? "") !== key) continue;
    const n = boothNumberForHouse(house);
    if (n != null && n > max) max = n;
  }
  return max + 1;
}

export function clusterBoothLabel(
  house: Pick<PublicHouse, "boothNumber" | "address">,
  cluster: readonly Pick<PublicHouse, "address">[],
): string | null {
  const n = boothNumberForHouse(house);
  if (n == null || cluster.length <= 1) return null;
  if (clusterIsSchoolCampus(cluster)) return `דוכן ${n}`;
  return `יחידה ${n}`;
}
