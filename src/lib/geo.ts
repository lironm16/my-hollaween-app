export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Ignore tiny GPS jumps on the map dot (standing-still jitter).
 * Still accept every watch callback — we only skip updating state when movement is below this.
 */
export const GPS_MOVE_METERS = 12;
/** Rebuild the walking path only after a real block of movement. */
export const ROUTE_REANCHOR_METERS = 80;

export function movedAtLeast(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  meters: number,
) {
  return distanceMeters(a, b) >= meters;
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
    λ1 + Math.atan2(Math.sin(brng) * sinδ * cosφ1, cosδ - sinφ1 * sinφ2);
  return { lat: (φ2 * 180) / Math.PI, lng: (λ2 * 180) / Math.PI };
}

export function formatDistance(m: number) {
  if (m < 1000) return `${Math.round(m)} מ׳`;
  return `${(m / 1000).toFixed(1)} ק״מ`;
}
