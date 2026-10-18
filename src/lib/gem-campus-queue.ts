import { clusterBoothLabel } from "@/lib/cluster-booth";
import { clusterMembersForHouse } from "@/lib/house-clusters";
import type { GemClusterQueueUi } from "@/lib/gem-hunt";
import type { PublicHouse } from "@/lib/types";

/** Multi-house building pin — one camera session for the cluster (school or shared address). */
export function gemClusterSessionMembers(
  mapHouses: PublicHouse[],
  house: PublicHouse,
): PublicHouse[] | null {
  const members = clusterMembersForHouse(mapHouses, house.id);
  if (members.length < 2) return null;
  return members;
}

/** @deprecated Use {@link gemClusterSessionMembers}. */
export const gemCampusSessionMembers = gemClusterSessionMembers;

/** First uncollected house in cluster order (members sorted by booth/unit). */
export function firstClusterGemHouseToHunt(
  members: readonly PublicHouse[],
  isCollected: (houseId: string) => boolean,
): PublicHouse | null {
  for (const h of members) {
    if (!isCollected(h.id)) return h;
  }
  return null;
}

/** Next house in cluster order after `justCollectedId` (members sorted by booth/unit). */
/** Next uncollected house after `currentId` without requiring a collect on `currentId`. */
export function skipClusterGemHouse(
  members: readonly PublicHouse[],
  isCollected: (houseId: string) => boolean,
  currentId: string,
): PublicHouse | null {
  const startIdx = members.findIndex((h) => h.id === currentId);
  if (startIdx >= 0) {
    for (let i = startIdx + 1; i < members.length; i += 1) {
      const h = members[i]!;
      if (!isCollected(h.id)) return h;
    }
  }
  for (const h of members) {
    if (h.id === currentId) continue;
    if (!isCollected(h.id)) return h;
  }
  return null;
}

export function nextClusterGemHouse(
  members: readonly PublicHouse[],
  isCollected: (houseId: string) => boolean,
  justCollectedId: string,
): PublicHouse | null {
  const startIdx = members.findIndex((h) => h.id === justCollectedId);
  if (startIdx >= 0) {
    for (let i = startIdx + 1; i < members.length; i += 1) {
      const h = members[i]!;
      if (!isCollected(h.id)) return h;
    }
  }
  for (const h of members) {
    if (h.id === justCollectedId) continue;
    if (!isCollected(h.id)) return h;
  }
  return null;
}

/** @deprecated Use {@link nextClusterGemHouse}. */
export const nextCampusGemHouse = nextClusterGemHouse;

function clusterHouseListIndex(cluster: readonly PublicHouse[], houseId: string): number | null {
  const i = cluster.findIndex((h) => h.id === houseId);
  return i >= 0 ? i + 1 : null;
}

export function gemClusterQueueHeadline(
  house: PublicHouse,
  cluster: readonly PublicHouse[],
): GemClusterQueueUi {
  const boothTitle = house.name?.trim() || house.arrival?.trim() || "בית";
  const booth = clusterBoothLabel(house, cluster);
  const idx = clusterHouseListIndex(cluster, house.id);
  const listLine = idx != null && cluster.length > 1 ? `${idx} מתוך ${cluster.length}` : null;
  const boothSubtitle = [listLine, booth].filter(Boolean).join(" · ");
  return { boothTitle, boothSubtitle };
}

/** @deprecated Use {@link gemClusterQueueHeadline}. */
export const campusGemBoothHeadline = gemClusterQueueHeadline;
