import { clusterBoothLabel } from "@/lib/cluster-booth";
import { clusterMembersForHouse } from "@/lib/house-clusters";
import { clusterIsSchoolCampus } from "@/lib/school-campus";
import type { PublicHouse } from "@/lib/types";

/** School campus with 2+ booths — sequential gem hunt in one camera session. */
export function gemCampusSessionMembers(
  mapHouses: PublicHouse[],
  house: PublicHouse,
): PublicHouse[] | null {
  const members = clusterMembersForHouse(mapHouses, house.id);
  if (!clusterIsSchoolCampus(members) || members.length < 2) return null;
  return members;
}

/** Next booth in cluster order after `justCollectedId` (members already sorted by דוכן). */
export function nextCampusGemHouse(
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

export function campusGemBoothHeadline(
  house: PublicHouse,
  cluster: readonly PublicHouse[],
): { title: string; subtitle: string } {
  const title = house.name?.trim() || house.arrival?.trim() || "דוכן";
  const booth = clusterBoothLabel(house, cluster);
  return { title, subtitle: booth ?? "" };
}
