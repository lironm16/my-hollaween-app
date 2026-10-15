import { gemProximity } from "@/lib/gem-hunt";
import type { PublicHouse } from "@/lib/types";

/** True when user is in hunt range of any filter-visible uncollected gem (toolbar / map signal). */
export function mapGemNearSignalActive(
  user: { lat: number; lng: number; accuracy?: number } | null | undefined,
  houses: readonly PublicHouse[],
  matchedIds: ReadonlySet<string>,
  isCollected: (houseId: string) => boolean,
): boolean {
  if (!user) return false;
  for (const house of houses) {
    if (!matchedIds.has(house.id)) continue;
    if (isCollected(house.id)) continue;
    if (gemProximity(user, house, false) === "hunt") return true;
  }
  return false;
}
