import { isIosLike } from "@/lib/gem-hunt-ar-platform";
import { getGemAnchorOverride } from "@/lib/gem-anchor-overrides";
import { getOsmGemAnchor } from "@/lib/gem-osm-anchor-cache";
import {
  GEM_OSM_ANCHOR_MAX_PIN_DISTANCE_M,
  isGemOsmAnchorStale,
} from "@/lib/gem-osm-anchor-data";
import { distanceMeters } from "@/lib/geo";
import {
  nearestSidewalkPoint,
  sidewalkGemAnchorForHouse,
  walkTowardNearestSpine,
} from "@/lib/gem-street-spines";
import type { GemFamily, GemMonsterId } from "@/lib/gem-monsters";
import {
  buildGemMonsterAssignment,
  countGemEligibleHouses,
  gemAlbumStickerPool,
  gemClusterSpreadForHouse,
  gemFamilyForHouse,
  gemHuntMapHouses,
  gemLabelHe,
  gemSpeciesLabelHe,
  gemMonsterForHouse,
  gemMonsterMeta,
  gemMonsterTint,
  gemVariantForHouse,
  gemVariantMeta,
  syncGemMonsterAssignment,
} from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";

export type { GemFamily, GemMonsterId };
export {
  buildGemMonsterAssignment,
  countGemEligibleHouses,
  gemAlbumStickerPool,
  gemFamilyForHouse,
  gemHuntMapHouses,
  gemLabelHe,
  gemSpeciesLabelHe,
  gemMonsterForHouse,
  gemMonsterMeta,
  gemMonsterTint,
  gemVariantForHouse,
  gemVariantMeta,
  syncGemMonsterAssignment,
};

/** @deprecated */
export type GemVariantId = GemMonsterId;

/** Show "find gem" affordance when within this range. */
export const GEM_APPROACH_METERS = 50;
/** Map / Android camera hunt band. */
export const GEM_WORLD_PIN_MAX_METERS = 15;
export const GEM_HUNT_METERS = GEM_WORLD_PIN_MAX_METERS;
/** iOS camera hunt — tighter sidewalk radius (neighbors + GPS). */
export const GEM_IOS_HUNT_METERS = 5;
/** @deprecated Stand-still gate removed — kept for copy/tests that reference the old value. */
export const GEM_STILL_SECONDS = 0;
/** Compass cone — gem may appear when facing within this many degrees of the house. */
export const GEM_FACING_TOLERANCE_DEG = 60;
/** Guaranteed gem reveal after this many seconds of panning in range. */
export const GEM_SCAN_REVEAL_SECONDS = 5;
/** Guaranteed gem reveal after this much pan rotation (degrees). */
export const GEM_SCAN_PAN_DEGREES = 180;
/** Show "can't see it?" help after this many seconds in hunt mode. */
export const GEM_HELP_AFTER_SECONDS = 8;
/** Approx. phone camera horizontal field of view — for pinning gem on screen. */
export const GEM_CAMERA_HFOV_DEG = 48;
/** Android WebXR — same on-site radius for placement, encounter, and collect. */
export const GEM_WEBXR_HUNT_METERS = GEM_WORLD_PIN_MAX_METERS;
/** Place Android AR pet at gemAnchorForHouse (GPS + anchor), not only hit-test at feet. */
export const GEM_WEBXR_GEO_PLACEMENT_ENABLED = true;
/** Approx. vertical FOV — used when tilting the phone up/down. */
export const GEM_CAMERA_VFOV_DEG = 50;
/** Ground gem elevation vs horizon when holding the phone level (negative = toward feet). */
export const GEM_ANCHOR_ELEVATION_DEG = -12;
/** On-screen hunt ring center (matches `.gem-hunt-overlay__scan-ring` at 42%). */
export const GEM_SCAN_RING_CENTER_X = 50;
export const GEM_SCAN_RING_CENTER_Y = 42;
/** Viewport-% radius for “gem inside ring” collect (slightly generous for thumb + compass jitter). */
export const GEM_SCAN_RING_COLLECT_RADIUS = 54;
/** Ground-level offset from the map pin (no floor height — see gemAnchorForHouse). */
export const GEM_ANCHOR_MIN_METERS = 2;
export const GEM_ANCHOR_MAX_METERS = 10;
/** Shared-building clusters — fan gems around the pin so markers stay tappable. */
export const GEM_CLUSTER_ANCHOR_MIN_METERS = 8;
export const GEM_CLUSTER_ANCHOR_MAX_METERS = 28;
/**
 * When reported distance to pin/anchor is this small, trust on-site GPS despite noisy accuracy.
 * (Avoids «2 m away» but still «far» when accuracy is 60–100 m.)
 */
export const GEM_ONSITE_TRUST_METERS = 12;

/** Camera collect — per-gem choreography (see gem-collect-dance.ts / CSS). */
export const GEM_COLLECT_OVERLAY_MS = 5000;
/** Multi-house cluster queue — one short dance per house, then next. */
export const GEM_CAMPUS_COLLECT_MS = 2400;
/** @deprecated alias */ export const GEM_CLUSTER_COLLECT_MS = GEM_CAMPUS_COLLECT_MS;
/** After collect dance — sticker flies into the album before closing the camera. */
export const GEM_STICKER_REVEAL_MS = 3200;
/** In-camera mini sticker book (off → navigate to /gem-bag?fly= after collect). */
export const GEM_IN_CAMERA_ALBUM_REVEAL_ENABLED = false;

export type GemCollectFinishOptions = {
  cheer?: boolean;
  navigateStickerBook?: boolean;
};

/** Header on camera when hunting several houses at one address in one session. */
export type GemClusterQueueUi = {
  boothTitle: string;
  boothSubtitle: string;
};

/** @deprecated Use {@link GemClusterQueueUi}. */
export type GemCampusQueueUi = GemClusterQueueUi;
/** Map toast after collect — matches visit/like cheer (~1.6s). */
export const GEM_CHEER_MS = 1400;
/** @deprecated use GEM_CHEER_MS */
export const GEM_CHEER_DISPLAY_MS = GEM_CHEER_MS;
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

/** House fields used for auto sidewalk anchor (address improves street matching). */
export type GemAnchorHouse = Pick<PublicHouse, "id" | "lat" | "lng"> & {
  address?: string | null;
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
/** Walk distance to the sidewalk gem anchor (camera hunt targets anchor only). */
export function gemDistanceMeters(
  user: { lat: number; lng: number },
  house: Pick<PublicHouse, "id" | "lat" | "lng">,
) {
  const anchor = gemAnchorForHouse(house);
  return distanceMeters(user, anchor);
}

function gemClusterFanAnchor(house: GemAnchorHouse, cluster: { index: number; size: number }): GemAnchor {
  const h = hashHouseSeed(house.id, "gem-cluster-spread");
  const slotDeg = (360 / cluster.size) * cluster.index;
  const jitter = (h % 15) - 7;
  const bearingFromHouseDeg = slotDeg + jitter;
  const ring = Math.floor(cluster.index / 10);
  const span = GEM_CLUSTER_ANCHOR_MAX_METERS - GEM_CLUSTER_ANCHOR_MIN_METERS;
  const offsetM =
    GEM_CLUSTER_ANCHOR_MIN_METERS +
    Math.min(span, ring * 5 + ((h >>> 8) % 1000) / (1000 / Math.max(span - ring * 5, 4)));
  const point = destinationPoint(house, bearingFromHouseDeg, offsetM);
  return { ...point, bearingFromHouseDeg, offsetM, calibrated: false };
}

export function gemAnchorForHouse(house: GemAnchorHouse): GemAnchor {
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

  const cluster = gemClusterSpreadForHouse(house.id);
  if (cluster && cluster.size > 1) {
    return gemClusterFanAnchor(house, cluster);
  }

  const osm = getOsmGemAnchor(house.id);
  if (
    osm &&
    osm.distanceM <= GEM_OSM_ANCHOR_MAX_PIN_DISTANCE_M &&
    !isGemOsmAnchorStale(house, osm)
  ) {
    const point = { lat: osm.lat, lng: osm.lng };
    const bearingFromHouseDeg = bearingDegrees(house, point);
    const offsetM = distanceMeters(house, point);
    return { ...point, bearingFromHouseDeg, offsetM, calibrated: false };
  }

  const spine = sidewalkGemAnchorForHouse(house);
  if (spine && spine.distanceM <= GEM_OSM_ANCHOR_MAX_PIN_DISTANCE_M) {
    const point = { lat: spine.lat, lng: spine.lng };
    const bearingFromHouseDeg = bearingDegrees(house, point);
    const offsetM = spine.distanceM;
    return { ...point, bearingFromHouseDeg, offsetM, calibrated: false };
  }

  const hint = walkTowardNearestSpine(house);
  if (hint && hint.distanceM >= GEM_ANCHOR_MIN_METERS) {
    const point = { lat: hint.lat, lng: hint.lng };
    const bearingFromHouseDeg = bearingDegrees(house, point);
    return { ...point, bearingFromHouseDeg, offsetM: hint.distanceM, calibrated: false };
  }

  const h = hashHouseSeed(house.id, "gem-anchor-v2");
  const fallbackSidewalk = nearestSidewalkPoint(house, null);
  let bearingFromHouseDeg: number;
  if (fallbackSidewalk && fallbackSidewalk.distanceM <= 55) {
    const toward = bearingDegrees(house, fallbackSidewalk.point);
    const spread = 38;
    bearingFromHouseDeg = toward + ((h % (spread * 2)) - spread);
  } else {
    bearingFromHouseDeg = h % 360;
  }
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
  devicePitch: number | null = null,
  hFovDeg = GEM_CAMERA_HFOV_DEG,
  vFovDeg = GEM_CAMERA_VFOV_DEG,
): GemScreenPlacement | null {
  if (deviceHeading == null || !Number.isFinite(deviceHeading)) return null;
  const distanceM = distanceMeters(user, anchor);
  const rel = relativeWalkBearingDeg(user, anchor, deviceHeading);
  if (rel == null) return null;
  const halfH = hFovDeg / 2;
  const inViewH = Math.abs(rel) <= halfH;
  const xSpread = 36;
  const xRaw = GEM_SCAN_RING_CENTER_X + (rel / halfH) * xSpread;
  /** Continuous clamp — no snap to 8/92 at FOV edge (avoids top↔bottom jumps when tilting). */
  const xPercent = Math.min(92, Math.max(8, xRaw));

  let yPercent: number;
  let inViewV = true;
  if (devicePitch != null && Number.isFinite(devicePitch)) {
    const halfV = vFovDeg / 2;
    const relElev = GEM_ANCHOR_ELEVATION_DEG - devicePitch;
    inViewV = Math.abs(relElev) <= halfV;
    const yRaw = GEM_SCAN_RING_CENTER_Y + (relElev / halfV) * 40;
    yPercent = Math.min(92, Math.max(8, yRaw));
  } else {
    yPercent = inViewH
      ? GEM_SCAN_RING_CENTER_Y
      : 40 + Math.min(14, (distanceM / GEM_HUNT_METERS) * 10);
  }

  const inView = inViewH && inViewV;
  return { xPercent, yPercent, inView, distanceM, relativeBearingDeg: rel };
}

/** World-locked camera gem — tighter than hunt band so neighbors (e.g. רוקח 32 vs 34) do not overlap. */
export function gemWorldPinVisible(
  placement: GemScreenPlacement | null,
  maxDistanceM = GEM_WORLD_PIN_MAX_METERS,
) {
  if (!placement?.inView) return false;
  return placement.distanceM <= maxDistanceM;
}

/** Gem pin overlaps the on-screen hunt ring (visual / legacy; collect no longer requires this). */
export function gemInScanRing(
  placement: GemScreenPlacement | null,
  ringRadiusPercent = GEM_SCAN_RING_COLLECT_RADIUS,
) {
  if (!placement?.inView) return false;
  const dx = placement.xPercent - GEM_SCAN_RING_CENTER_X;
  const dy = placement.yPercent - GEM_SCAN_RING_CENTER_Y;
  const dist = Math.hypot(dx, dy);
  if (dist <= ringRadiusPercent) return true;
  if (
    Math.abs(placement.relativeBearingDeg) <= GEM_FACING_TOLERANCE_DEG &&
    dist <= ringRadiusPercent + 14
  ) {
    return true;
  }
  return false;
}

/** Ease gem sprite toward ring center horizontally when close (display only; Y stays world-locked). */
export function gemPlacementDisplaySnap(placement: GemScreenPlacement | null) {
  if (!placement?.inView) return placement;
  const dx = placement.xPercent - GEM_SCAN_RING_CENTER_X;
  const xDist = Math.abs(dx);
  if (xDist <= 10) {
    return { ...placement, xPercent: GEM_SCAN_RING_CENTER_X };
  }
  if (xDist <= 28) {
    const pull = 0.45;
    return {
      ...placement,
      xPercent: placement.xPercent + (GEM_SCAN_RING_CENTER_X - placement.xPercent) * pull,
    };
  }
  return placement;
}

/** Hunt/collect radius for this device (5 m iOS Safari, 15 m otherwise). */
export function activeGemHuntMeters(): number {
  if (typeof navigator !== "undefined" && isIosLike()) return GEM_IOS_HUNT_METERS;
  return GEM_HUNT_METERS;
}

export function canCollectGem(
  userLocation: { lat: number; lng: number } | null,
  house: Pick<PublicHouse, "id" | "lat" | "lng">,
  collected: boolean,
  _standingStill?: boolean,
  simulateInRange = false,
) {
  if (collected) return false;
  return simulateInRange || gemProximity(userLocation, house, false) === "hunt";
}

/** Pessimistic hunt band — avoids treating a wild GPS jump as “at the anchor”. */
export function withinGemHuntMeters(
  user: { lat: number; lng: number; accuracy?: number },
  target: { lat: number; lng: number },
  maxMeters = GEM_HUNT_METERS,
) {
  const d = distanceMeters(user, target);
  if (d > maxMeters) return false;
  const acc = user.accuracy;
  if (acc == null || !Number.isFinite(acc) || acc <= 0) return true;
  const slack = 18;
  if (d <= GEM_ONSITE_TRUST_METERS) {
    // Teleport onto the pin with a huge accuracy circle — still not “on site”.
    if (acc > 150) return false;
    if (acc <= 100) return true;
    if (d + Math.min(acc, 120) <= maxMeters + slack) return true;
    return d <= Math.min(8, maxMeters);
  }
  return d + Math.min(acc, 120) <= maxMeters + slack;
}

function inGemHuntBand(
  user: { lat: number; lng: number; accuracy?: number },
  house: Pick<PublicHouse, "id" | "lat" | "lng">,
  maxMeters = activeGemHuntMeters(),
) {
  const anchor = gemAnchorForHouse(house);
  return withinGemHuntMeters(user, anchor, maxMeters);
}

/** Within active hunt meters of the gem anchor — camera hunt / collect band. */
export function userWithinGemHuntRange(
  user: { lat: number; lng: number; accuracy?: number } | null,
  house: Pick<PublicHouse, "id" | "lat" | "lng">,
) {
  if (!user) return false;
  return inGemHuntBand(user, house);
}

export function gemProximity(
  user: { lat: number; lng: number; accuracy?: number } | null,
  house: Pick<PublicHouse, "id" | "lat" | "lng">,
  collected: boolean,
): GemProximity {
  if (collected) return "collected";
  if (!user) return "far";
  const dHouse = distanceMeters(user, house);
  const dAnchor = distanceMeters(user, gemAnchorForHouse(house));
  const d = Math.min(dHouse, dAnchor);
  const acc = user.accuracy;
  if (acc != null && Number.isFinite(acc) && acc > 150 && d < 3) return "far";
  if (inGemHuntBand(user, house)) return "hunt";
  if (d <= GEM_APPROACH_METERS) {
    if (
      d > GEM_ONSITE_TRUST_METERS &&
      acc != null &&
      Number.isFinite(acc) &&
      acc > GEM_APPROACH_METERS
    ) {
      return "far";
    }
    return "approach";
  }
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

/** Compass bearing → short Hebrew label (map / GPS fallback when no gyro). */
export function bearingClockLabelHe(bearingDeg: number) {
  const b = normalizeHeading(bearingDeg);
  if (b >= 337.5 || b < 22.5) return "צפון";
  if (b < 67.5) return "צפון-מזרח";
  if (b < 112.5) return "מזרח";
  if (b < 157.5) return "דרום-מזרח";
  if (b < 202.5) return "דרום";
  if (b < 247.5) return "דרום-מערב";
  if (b < 292.5) return "מערב";
  return "צפון-מערב";
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

/**
 * Hunt «רמז» arrow + שמאלה/ימינה copy — screen-space (matches gem pin left/right on camera).
 * Raw {@link relativeWalkBearingDeg} follows map/compass; UI chevron uses the mirror.
 */
export function navTurnBearingForUi(turnBearingDeg: number) {
  return -turnBearingDeg;
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
    titleHe: "שדון ראשון",
    descriptionHe: "מצאתם שדון אחד",
    target: 1,
  },
  {
    id: "hunter5",
    titleHe: "צייד/ת שדונים",
    descriptionHe: "5 שדונים",
    target: 5,
  },
  {
    id: "hunter10",
    titleHe: "שכונה מלאה קסם",
    descriptionHe: "10 שדונים",
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
