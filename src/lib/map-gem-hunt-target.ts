import { gemClusterSessionMembers } from "@/lib/gem-campus-queue";
import { gemDistanceMeters, userWithinGemHuntRange } from "@/lib/gem-hunt";
import type { PublicHouse } from "@/lib/types";

function nearestByAnchorDistance(
  user: { lat: number; lng: number },
  houses: readonly PublicHouse[],
): PublicHouse | null {
  if (houses.length === 0) return null;
  let best = houses[0]!;
  let bestD = gemDistanceMeters(user, best);
  for (let i = 1; i < houses.length; i += 1) {
    const h = houses[i]!;
    const d = gemDistanceMeters(user, h);
    if (d < bestD) {
      best = h;
      bestD = d;
    }
  }
  return best;
}

/** First uncollected cluster booth in proximity (iOS 5 m / default hunt band), else nearest in cluster. */
export function firstClusterGemHouseInProximity(
  members: readonly PublicHouse[],
  user: { lat: number; lng: number; accuracy?: number } | null,
  isCollected: (houseId: string) => boolean,
): PublicHouse | null {
  const open = members.filter((h) => !isCollected(h.id));
  if (open.length === 0) return null;
  if (!user) return open[0] ?? null;
  const inRange = open.filter((h) => userWithinGemHuntRange(user, h));
  const pool = inRange.length > 0 ? inRange : open;
  return nearestByAnchorDistance(user, pool);
}

/** Closest uncollected gem in the visible hunt pool (prefers in-range anchors). */
export function pickMapFabGemHuntTarget(
  user: { lat: number; lng: number; accuracy?: number } | null,
  visibleHouses: readonly PublicHouse[],
  allMapHouses: readonly PublicHouse[],
  isCollected: (houseId: string) => boolean,
): PublicHouse | null {
  const open = visibleHouses.filter((h) => !isCollected(h.id));
  if (open.length === 0) return null;
  if (!user) return open[0] ?? null;

  const inRange = open.filter((h) => userWithinGemHuntRange(user, h));
  let primary = inRange.length > 0 ? nearestByAnchorDistance(user, inRange) : nearestByAnchorDistance(user, open);
  if (!primary) return null;

  const cluster = gemClusterSessionMembers([...allMapHouses], primary);
  if (cluster && cluster.length >= 2) {
    const clusterOpen = cluster.filter(
      (h) => !isCollected(h.id) && open.some((candidate) => candidate.id === h.id),
    );
    if (clusterOpen.length >= 2) {
      const inClusterRange = clusterOpen.filter((h) => userWithinGemHuntRange(user, h));
      if (inClusterRange.length > 0) {
        primary = nearestByAnchorDistance(user, inClusterRange) ?? primary;
      } else {
        primary = nearestByAnchorDistance(user, clusterOpen) ?? primary;
      }
    } else if (clusterOpen.length === 1) {
      primary = clusterOpen[0]!;
    }
  }

  return primary;
}

/** While the map hunt camera is open — switch demon when user enters another gem reveal band. */
export function pickMapRovingGemHuntHouse(
  user: { lat: number; lng: number; accuracy?: number },
  visibleHouses: readonly PublicHouse[],
  allMapHouses: readonly PublicHouse[],
  isCollected: (houseId: string) => boolean,
  pinnedHouseId: string | null,
  currentHouseId: string | null,
): PublicHouse | null {
  if (pinnedHouseId) {
    const pinned = visibleHouses.find((h) => h.id === pinnedHouseId);
    if (pinned && !isCollected(pinned.id)) return pinned;
  }
  const open = visibleHouses.filter((h) => !isCollected(h.id));
  const inRange = open.filter((h) => userWithinGemHuntRange(user, h));
  if (inRange.length === 0) {
    const current = currentHouseId ? open.find((h) => h.id === currentHouseId) : null;
    return current ?? pickMapFabGemHuntTarget(user, visibleHouses, allMapHouses, isCollected);
  }
  return nearestByAnchorDistance(user, inRange);
}
