import { gemProximity } from "@/lib/gem-hunt";
import type { PublicHouse } from "@/lib/types";

function isNearUncollectedGem(
  user: { lat: number; lng: number; accuracy?: number },
  house: PublicHouse,
  matchedIds: ReadonlySet<string>,
  isCollected: (houseId: string) => boolean,
): boolean {
  if (!matchedIds.has(house.id)) return false;
  if (isCollected(house.id)) return false;
  return gemProximity(user, house, false) === "hunt";
}

/** House ids within hunt range of an uncollected, filter-visible gem. */
export function mapGemNearHouseIds(
  user: { lat: number; lng: number; accuracy?: number } | null | undefined,
  houses: readonly PublicHouse[],
  matchedIds: ReadonlySet<string>,
  isCollected: (houseId: string) => boolean,
): ReadonlySet<string> {
  if (!user) return new Set();
  const ids = new Set<string>();
  for (const house of houses) {
    if (isNearUncollectedGem(user, house, matchedIds, isCollected)) ids.add(house.id);
  }
  return ids;
}

/** True when user is in hunt range of any filter-visible uncollected gem (toolbar / map signal). */
export function mapGemNearSignalActive(
  user: { lat: number; lng: number; accuracy?: number } | null | undefined,
  houses: readonly PublicHouse[],
  matchedIds: ReadonlySet<string>,
  isCollected: (houseId: string) => boolean,
): boolean {
  if (!user) return false;
  for (const house of houses) {
    if (isNearUncollectedGem(user, house, matchedIds, isCollected)) return true;
  }
  return false;
}
