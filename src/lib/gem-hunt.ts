import { getGemAnchorOverride } from "@/lib/gem-anchor-overrides";
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
/** Approx. phone camera horizontal field of view — for pinning gem on screen. */
export const GEM_CAMERA_HFOV_DEG = 62;
/** Ground-level offset from the map pin (no floor height — see gemAnchorForHouse). */
export const GEM_ANCHOR_MIN_METERS = 2;
export const GEM_ANCHOR_MAX_METERS = 10;

/** Camera hunt burst after tap — keep in sync with gem-collect-* overlay CSS (~0.65s). */
export const GEM_COLLECT_OVERLAY_MS = 650;
/** Map «אוצר נאסף!» popup — animation + ~2s extra hold. */
export const GEM_CHEER_DISPLAY_MS = 4200;
/** @deprecated use GEM_COLLECT_OVERLAY_MS / GEM_CHEER_DISPLAY_MS */
export const GEM_COLLECT_ANIMATION_MS = GEM_COLLECT_OVERLAY_MS;

export type GemProximity = "far" | "approach" | "hunt" | "collected";

export type GemAnchor = {
  lat: number;
  lng: number;
  bearingFromHouseDeg: number;
  offsetM: number;
  /** Set by admin on-site calibration (this device’s localStorage). */
  calibrated?: boolean;
};

function hashHouseSeed(id: string, seed: string) {
  let h = 2166136261;
  const s = `${id}\0${seed}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Move `distanceM` meters from `origin` along compass `bearingDeg` (0 = north). */
export function destinationPoint(
  origin: { lat: number; lng: number },
  bearingDeg: number,
  distanceM: number,
) {
  const R = 6371000;
  const brng = (bearingDeg * Math.PI) / 180;
  const φ1 = (origin.lat * Math.PI) / 180;
  const λ1 = (origin.lng * Math.PI) / 180;
  const δ = distanceM / R;
  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);
  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(brng);
  const φ2 = Math.asin(sinφ2);
  const λ2 =
    λ1 +
    Math.atan2(Math.sin(brng) * sinδ * cosφ1, cosδ - sinφ1 * sinφ2);
  return { lat: (φ2 * 180) / Math.PI, lng: (λ2 * 180) / Math.PI };
}

/**
 * Stable ground pin near the building entrance (map lat/lng).
 * There is no vertical axis — high-floor apartments share the same ground GPS;
 * the hunt means “at the building / entrance zone”, not at window height.
 */
export function gemAnchorForHouse(house: Pick<PublicHouse, "id" | "lat" | "lng">): GemAnchor {
  const override = getGemAnchorOverride(house.id);
  if (override) {
    const bearingFromHouseDeg = bearingDegrees(house, override);
    const offsetM = distanceMeters(house, override);
    return {
      lat: override.lat,
      lng: override.lng,
      bearingFromHouseDeg,
      offsetM,
      calibrated: true,
    };
  }
  const h = hashHouseSeed(house.id, "gem-anchor-v1");
  const bearingFromHouseDeg = h % 360;
  const span = GEM_ANCHOR_MAX_METERS - GEM_ANCHOR_MIN_METERS;
  const offsetM = GEM_ANCHOR_MIN_METERS + ((h >>> 8) % 1000) / (1000 / span);
  const point = destinationPoint(house, bearingFromHouseDeg, offsetM);
  return { ...point, bearingFromHouseDeg, offsetM, calibrated: false };
}

export type GemScreenPlacement = {
  xPercent: number;
  yPercent: number;
  /** Gem bearing is inside the camera view cone. */
  inView: boolean;
  distanceM: number;
  relativeBearingDeg: number;
};

/** Map anchor direction to on-screen position (moves when you pan — pseudo-AR pin). */
export function gemScreenPlacement(
  user: { lat: number; lng: number },
  anchor: Pick<GemAnchor, "lat" | "lng">,
  deviceHeading: number | null,
  hFovDeg = GEM_CAMERA_HFOV_DEG,
): GemScreenPlacement | null {
  if (deviceHeading == null || !Number.isFinite(deviceHeading)) return null;
  const distanceM = distanceMeters(user, anchor);
  const rel = relativeWalkBearingDeg(user, anchor, deviceHeading);
  if (rel == null) return null;
  const half = hFovDeg / 2;
  const inView = Math.abs(rel) <= half;
  const xRaw = 50 + (rel / half) * 42;
  const xPercent = inView ? Math.min(90, Math.max(10, xRaw)) : rel > 0 ? 92 : 8;
  const yPercent = 40 + Math.min(14, (distanceM / GEM_HUNT_METERS) * 10);
  return { xPercent, yPercent, inView, distanceM, relativeBearingDeg: rel };
}

export function canCollectGem(
  userLocation: { lat: number; lng: number } | null,
  house: Pick<PublicHouse, "id" | "lat" | "lng">,
  collected: boolean,
  standingStill: boolean,
  simulateInRange: boolean,
) {
  if (collected) return false;
  const inRange = simulateInRange || gemProximity(userLocation, house, false) === "hunt";
  return inRange && (standingStill || simulateInRange);
}

/** Pessimistic hunt band — avoids treating a wild GPS jump as “at the anchor”. */
export function withinGemHuntMeters(
  user: { lat: number; lng: number; accuracy?: number },
  target: { lat: number; lng: number },
) {
  const d = distanceMeters(user, target);
  if (d > GEM_HUNT_METERS) return false;
  const acc = user.accuracy;
  if (acc == null || !Number.isFinite(acc) || acc <= 0) return true;
  const slack = 18;
  return d + Math.min(acc, 120) <= GEM_HUNT_METERS + slack;
}

export function gemProximity(
  user: { lat: number; lng: number; accuracy?: number } | null,
  house: Pick<PublicHouse, "id" | "lat" | "lng">,
  collected: boolean,
): GemProximity {
  if (collected) return "collected";
  if (!user) return "far";
  const anchor = gemAnchorForHouse(house);
  const dHouse = distanceMeters(user, house);
  const dAnchor = distanceMeters(user, anchor);
  const d = Math.min(dHouse, dAnchor);
  if (withinGemHuntMeters(user, anchor)) return "hunt";
  if (d <= GEM_HUNT_METERS) {
    const acc = user.accuracy;
    if (acc != null && Number.isFinite(acc) && acc > GEM_APPROACH_METERS) return "far";
    return "approach";
  }
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

/** Degrees to rotate a “walk this way” arrow on screen (0 = straight ahead). */
export function relativeWalkBearingDeg(
  user: { lat: number; lng: number },
  house: Pick<PublicHouse, "lat" | "lng">,
  deviceHeading: number | null,
) {
  if (deviceHeading == null || !Number.isFinite(deviceHeading)) return null;
  const target = bearingDegrees(user, house);
  let rel = target - deviceHeading;
  while (rel > 180) rel -= 360;
  while (rel < -180) rel += 360;
  return rel;
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
