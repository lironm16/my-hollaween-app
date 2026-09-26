import { distanceMeters } from "@/lib/geo";
import type { LatLng } from "@/lib/route";

function bearingDegrees(
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

function destinationPoint(
  origin: { lat: number; lng: number },
  bearingDeg: number,
  distM: number,
) {
  const R = 6371000;
  const brng = (bearingDeg * Math.PI) / 180;
  const φ1 = (origin.lat * Math.PI) / 180;
  const λ1 = (origin.lng * Math.PI) / 180;
  const δ = distM / R;
  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);
  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(brng);
  const φ2 = Math.asin(sinφ2);
  const λ2 =
    λ1 + Math.atan2(Math.sin(brng) * sinδ * cosφ1, cosδ - sinφ1 * sinφ2);
  return { lat: (φ2 * 180) / Math.PI, lng: (λ2 * 180) / Math.PI };
}

/** Walkable street centerlines — gems snap here instead of random offsets into yards. */
export type GemStreetSpine = {
  /** Match house.address street name (without number). */
  aliases: string[];
  points: LatLng[];
};

/** Approximate sidewalk spines — Ramat Gan old neighborhoods (foot access). */
export const GEM_STREET_SPINES: GemStreetSpine[] = [
  {
    aliases: ["רוקח"],
    points: [
      { lat: 32.09012, lng: 34.8095 },
      { lat: 32.09072, lng: 34.81005 },
      { lat: 32.09132, lng: 34.8106 },
      { lat: 32.09192, lng: 34.81115 },
      { lat: 32.09252, lng: 34.8117 },
      { lat: 32.09312, lng: 34.81225 },
      { lat: 32.09372, lng: 34.8128 },
      { lat: 32.09435, lng: 34.81335 },
      { lat: 32.09505, lng: 34.81085 },
      { lat: 32.09675, lng: 34.81645 },
    ],
  },
  {
    aliases: ["המרגנית", "מרגנית"],
    points: [
      { lat: 32.09295, lng: 34.8068 },
      { lat: 32.09325, lng: 34.8082 },
      { lat: 32.09346, lng: 34.80942 },
      { lat: 32.09362, lng: 34.81085 },
      { lat: 32.09378, lng: 34.81235 },
      { lat: 32.09395, lng: 34.81385 },
    ],
  },
  {
    aliases: ["קריניצי", "שדרת קריניצי"],
    points: [
      { lat: 32.09022, lng: 34.80615 },
      { lat: 32.09022, lng: 34.80755 },
      { lat: 32.09022, lng: 34.80915 },
      { lat: 32.09022, lng: 34.81075 },
      { lat: 32.09022, lng: 34.81235 },
    ],
  },
  {
    aliases: ["נרקיסים", "שדרת הנרקיסים"],
    points: [
      { lat: 32.08985, lng: 34.8079 },
      { lat: 32.09045, lng: 34.80845 },
      { lat: 32.09105, lng: 34.8090 },
      { lat: 32.09165, lng: 34.80955 },
    ],
  },
  {
    aliases: ["חרוזים"],
    points: [
      { lat: 32.0895, lng: 34.8018 },
      { lat: 32.0901, lng: 34.8028 },
      { lat: 32.0907, lng: 34.8038 },
      { lat: 32.0913, lng: 34.8048 },
    ],
  },
  {
    aliases: ["יהודית"],
    points: [
      { lat: 32.0915, lng: 34.8105 },
      { lat: 32.0921, lng: 34.8110 },
      { lat: 32.0927, lng: 34.8115 },
    ],
  },
  {
    aliases: ["אחימאיר", "אבא אחימאיר", "אבא אחימיר", "ahimeir"],
    points: [
      { lat: 32.0929, lng: 34.80938 },
      { lat: 32.0924, lng: 34.8094 },
      { lat: 32.0919, lng: 34.80942 },
      { lat: 32.0914, lng: 34.80944 },
      { lat: 32.0909, lng: 34.80946 },
      { lat: 32.0904, lng: 34.80948 },
      { lat: 32.0899, lng: 34.8095 },
      { lat: 32.0894, lng: 34.80952 },
    ],
  },
  {
    aliases: ["רמבה"],
    points: [
      { lat: 32.09275, lng: 34.80855 },
      { lat: 32.09275, lng: 34.80905 },
      { lat: 32.09275, lng: 34.80955 },
      { lat: 32.09275, lng: 34.81005 },
    ],
  },
  {
    aliases: ["מוזס", "Mozes"],
    points: [
      { lat: 32.0905, lng: 34.8120 },
      { lat: 32.0910, lng: 34.81205 },
      { lat: 32.0915, lng: 34.8121 },
      { lat: 32.0920, lng: 34.81215 },
    ],
  },
];

export function streetNameFromAddress(address: string | undefined | null): string | null {
  if (!address) return null;
  const head = address.split(",")[0]?.trim() ?? "";
  const withoutNum = head.replace(/\s*\d+\s*$/u, "").trim();
  return withoutNum || null;
}

function normalizeStreetForMatch(street: string): string {
  let norm = street.replace(/\s+/g, " ").trim();
  norm = norm.replace(/^אבא\s+/u, "").replace(/\s+אבא\s*$/u, "").trim();
  return norm;
}

function streetNameMatches(addressStreet: string, aliases: string[]): boolean {
  const norm = normalizeStreetForMatch(addressStreet);
  return aliases.some((a) => {
    const alias = normalizeStreetForMatch(a);
    return norm === alias || norm.includes(alias) || alias.includes(norm);
  });
}

type SpineHit = {
  point: LatLng;
  distanceM: number;
  spine: GemStreetSpine;
  segmentIndex: number;
  segmentBearingDeg: number;
};

function nearestOnSegment(
  origin: LatLng,
  a: LatLng,
  b: LatLng,
): { point: LatLng; distanceM: number; along01: number } {
  const cosLat = Math.cos((origin.lat * Math.PI) / 180);
  const mPerDegLat = 111_320;
  const mPerDegLng = mPerDegLat * cosLat;
  const ax = (a.lng - origin.lng) * mPerDegLng;
  const ay = (a.lat - origin.lat) * mPerDegLat;
  const bx = (b.lng - origin.lng) * mPerDegLng;
  const by = (b.lat - origin.lat) * mPerDegLat;
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  const t = len2 < 1e-6 ? 0 : Math.max(0, Math.min(1, (-ax * abx - ay * aby) / len2));
  const px = ax + t * abx;
  const py = ay + t * aby;
  const point = {
    lat: origin.lat + py / mPerDegLat,
    lng: origin.lng + px / mPerDegLng,
  };
  return { point, distanceM: distanceMeters(origin, point), along01: t };
}

function segmentBearing(a: LatLng, b: LatLng) {
  return bearingDegrees(a, b);
}

function nearestOnSpine(origin: LatLng, spine: GemStreetSpine): Omit<SpineHit, "spine"> & { spine: GemStreetSpine } | null {
  const pts = spine.points;
  if (pts.length < 2) return null;
  let best: SpineHit | null = null;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const hit = nearestOnSegment(origin, a, b);
    if (!best || hit.distanceM < best.distanceM) {
      best = {
        point: hit.point,
        distanceM: hit.distanceM,
        spine,
        segmentIndex: i,
        segmentBearingDeg: segmentBearing(a, b),
      };
    }
  }
  return best;
}

function moveAlongSpine(
  spine: GemStreetSpine,
  segmentIndex: number,
  fromPoint: LatLng,
  meters: number,
  sign: 1 | -1,
): LatLng {
  const pts = spine.points;
  const a = pts[segmentIndex]!;
  const b = pts[segmentIndex + 1] ?? a;
  const brng = segmentBearing(a, b);
  const dir = sign >= 0 ? brng : (brng + 180) % 360;
  return destinationPoint(fromPoint, dir, Math.abs(meters));
}

/** Max distance from house pin to snap onto a named street spine. */
export const GEM_STREET_SNAP_NAMED_METERS = 120;
/** Max distance for any spine when address has no street match. */
export const GEM_STREET_SNAP_GENERIC_METERS = 55;
/** @deprecated straight clamp — prefer staying on spine (see gemAnchorForHouse). */
export const GEM_STREET_MAX_FROM_HOUSE_METERS = 28;
/** If a named spine is farther than this, fall back to cone offset (bad geocode). */
export const GEM_STREET_NAMED_ABORT_METERS = 65;

export function nearestSidewalkPoint(
  origin: LatLng,
  address: string | undefined | null,
): SpineHit | null {
  const street = streetNameFromAddress(address);
  const namedSpines =
    street != null
      ? GEM_STREET_SPINES.filter((s) => streetNameMatches(street, s.aliases))
      : [];
  const pool = namedSpines.length > 0 ? namedSpines : GEM_STREET_SPINES;
  const maxM =
    namedSpines.length > 0 ? GEM_STREET_SNAP_NAMED_METERS : GEM_STREET_SNAP_GENERIC_METERS;

  let best: SpineHit | null = null;
  for (const spine of pool) {
    const hit = nearestOnSpine(origin, spine);
    if (!hit || hit.distanceM > maxM) continue;
    if (!best || hit.distanceM < best.distanceM) best = hit;
  }
  return best;
}

export function clampTowardHouse(
  house: LatLng,
  anchor: LatLng,
  maxM: number,
): LatLng {
  const d = distanceMeters(house, anchor);
  if (d <= maxM) return anchor;
  const brng = bearingDegrees(house, anchor);
  return destinationPoint(house, brng, maxM);
}

export function jitterAlongSidewalk(
  hit: SpineHit,
  houseId: string,
  jitterSeed: string,
): LatLng {
  let h = 2166136261;
  const s = `${houseId}\0${jitterSeed}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h >>>= 0;
  const meters = 2 + (h % 500) / 100;
  const sign: 1 | -1 = (h & 1) === 0 ? 1 : -1;
  return moveAlongSpine(hit.spine, hit.segmentIndex, hit.point, meters, sign);
}

/** Stable sidewalk anchor from street spines (sync — no OSRM). */
export function sidewalkGemAnchorForHouse(house: {
  id: string;
  lat: number;
  lng: number;
  address?: string | null;
}): { lat: number; lng: number; distanceM: number; source: "spine" } | null {
  const sidewalk = nearestSidewalkPoint(house, house.address ?? null);
  if (!sidewalk) return null;
  const point = jitterAlongSidewalk(sidewalk, house.id, "gem-anchor-v5-sidewalk");
  return {
    lat: point.lat,
    lng: point.lng,
    distanceM: distanceMeters(house, point),
    source: "spine",
  };
}
