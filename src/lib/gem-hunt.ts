import { distanceMeters } from "@/lib/geo";
import type { GemFamily, GemType, GemVariantId } from "@/lib/gem-variants";
import {
  countGemEligibleHouses,
  gemFamilyForHouse,
  gemLabelHe,
  gemTypeForHouse,
  gemVariantForHouse,
  GEM_VARIANTS,
} from "@/lib/gem-variants";
import type { PublicHouse } from "@/lib/types";

export type { GemFamily, GemType, GemVariantId };
export {
  countGemEligibleHouses,
  gemFamilyForHouse,
  gemLabelHe,
  gemTypeForHouse,
  gemVariantForHouse,
  GEM_VARIANTS,
};

/** Show "find gem" affordance when within this range. */
export const GEM_APPROACH_METERS = 50;
/** Must be this close (and still) to start the camera hunt. */
export const GEM_HUNT_METERS = 25;
/** Ignore GPS jitter — user must stand still this long before hunting. */
export const GEM_STILL_SECONDS = 2;
/** Compass cone — gem may appear when facing within this many degrees of the house. */
export const GEM_FACING_TOLERANCE_DEG = 60;
/** Guaranteed gem reveal after this many seconds of panning in range. */
export const GEM_SCAN_REVEAL_SECONDS = 5;
/** Guaranteed gem reveal after this much pan rotation (degrees). */
export const GEM_SCAN_PAN_DEGREES = 180;
/** Show "can't see it?" help after this many seconds in hunt mode. */
export const GEM_HELP_AFTER_SECONDS = 8;

export type GemProximity = "far" | "approach" | "hunt" | "collected";

export function gemProximity(
  user: { lat: number; lng: number } | null,
  house: Pick<PublicHouse, "lat" | "lng">,
  collected: boolean,
): GemProximity {
  if (collected) return "collected";
  if (!user) return "far";
  const d = distanceMeters(user, house);
  if (d <= GEM_HUNT_METERS) return "hunt";
  if (d <= GEM_APPROACH_METERS) return "approach";
  return "far";
}

/** Bearing from `from` to `to` in degrees (0 = north, clockwise). */
export function bearingDegrees(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) {
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** Smallest difference between two compass headings (degrees). */
export function headingDelta(a: number, b: number) {
  const d = Math.abs(normalizeHeading(a) - normalizeHeading(b)) % 360;
  return d > 180 ? 360 - d : d;
}

export function normalizeHeading(deg: number) {
  return ((deg % 360) + 360) % 360;
}

export function facingHouse(
  user: { lat: number; lng: number },
  house: Pick<PublicHouse, "lat" | "lng">,
  deviceHeading: number | null,
  toleranceDeg = GEM_FACING_TOLERANCE_DEG,
) {
  if (deviceHeading == null || !Number.isFinite(deviceHeading)) return false;
  const target = bearingDegrees(user, house);
  return headingDelta(deviceHeading, target) <= toleranceDeg;
}

export type GemAchievement = {
  id: string;
  titleHe: string;
  descriptionHe: string;
  target: number;
  /** When set, counts only gems in these families. */
  gemFamilies?: GemFamily[];
};

export const GEM_ACHIEVEMENTS: GemAchievement[] = [
  {
    id: "first",
    titleHe: "אוצר ראשון",
    descriptionHe: "אספתם אוצר אחד",
    target: 1,
  },
  {
    id: "hunter5",
    titleHe: "צייד/ת רוחות",
    descriptionHe: "5 אוצרות",
    target: 5,
  },
  {
    id: "hunter10",
    titleHe: "שכונה מלאה קסם",
    descriptionHe: "10 אוצרות",
    target: 10,
  },
  {
    id: "half",
    titleHe: "בדרך למחצית",
    descriptionHe: "חצי מהמפה",
    target: 0,
  },
  {
    id: "ghost3",
    titleHe: "רוחות בלילה",
    descriptionHe: "3 רוחות",
    target: 3,
    gemFamilies: ["ghost"],
  },
  {
    id: "pumpkin3",
    titleHe: "מדשאת דלעות",
    descriptionHe: "3 דלעות",
    target: 3,
    gemFamilies: ["pumpkin"],
  },
  {
    id: "bat3",
    titleHe: "לילה מעופף",
    descriptionHe: "3 עטלפים",
    target: 3,
    gemFamilies: ["bat"],
  },
];

export function achievementProgress(
  achievement: GemAchievement,
  collectedIds: string[],
  housesById: Map<string, PublicHouse>,
  totalEligible: number,
) {
  let count: number;
  if (achievement.id === "half") {
    const target = Math.max(1, Math.ceil(totalEligible / 2));
    count = collectedIds.length;
    return { count, target, done: count >= target };
  }
  if (achievement.gemFamilies?.length) {
    count = collectedIds.filter((id) => {
      const house = housesById.get(id);
      return house && achievement.gemFamilies!.includes(gemFamilyForHouse(house));
    }).length;
  } else {
    count = collectedIds.length;
  }
  return { count, target: achievement.target, done: count >= achievement.target };
}
