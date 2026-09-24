import { distanceMeters } from "@/lib/geo";
import type { GemFamily, GemMonsterId } from "@/lib/gem-monsters";
import {
  countGemEligibleHouses,
  gemFamilyForHouse,
  gemLabelHe,
  gemMonsterForHouse,
  gemMonsterMeta,
  gemMonsterTint,
  gemVariantForHouse,
  gemVariantMeta,
} from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";

export type { GemFamily, GemMonsterId };
export {
  countGemEligibleHouses,
  gemFamilyForHouse,
  gemLabelHe,
  gemMonsterForHouse,
  gemMonsterMeta,
  gemMonsterTint,
  gemVariantForHouse,
  gemVariantMeta,
};

/** @deprecated */
export type GemVariantId = GemMonsterId;

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

/** Hunt overlay + cheer — keep in sync with gem-collect-* CSS durations */
export const GEM_COLLECT_ANIMATION_MS = 2400;

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
    titleHe: "צייד/ת אוצרות",
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
];

export function achievementProgress(
  achievement: GemAchievement,
  collectedIds: string[],
  _housesById: Map<string, PublicHouse>,
  totalEligible: number,
) {
  const count = collectedIds.length;
  if (achievement.id === "half") {
    const target = Math.max(1, Math.ceil(totalEligible / 2));
    return { count, target, done: count >= target };
  }
  return { count, target: achievement.target, done: count >= achievement.target };
}
