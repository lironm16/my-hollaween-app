import { canonicalHouseId } from "@/lib/ids";
import type { House } from "@/lib/types";

function adminAnomalyReviewsFingerprint(house: House): string {
  return JSON.stringify(house.adminAnomalyReviews ?? null);
}

/** Shared by Firestore batch writes — exported for tests. */
export function housesChangedForFirestorePersist(prev: House[], next: House[]): House[] {
  const before = new Map(prev.map((house) => [canonicalHouseId(house.id), house]));
  const out: House[] = [];
  for (const house of next) {
    const id = canonicalHouseId(house.id);
    const prevHouse = before.get(id);
    if (!prevHouse) {
      out.push(house);
      continue;
    }
    if (prevHouse.updatedAt !== house.updatedAt) {
      out.push(house);
      continue;
    }
    if (adminAnomalyReviewsFingerprint(prevHouse) !== adminAnomalyReviewsFingerprint(house)) {
      out.push(house);
    }
  }
  return out;
}
