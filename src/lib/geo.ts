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

/** Phone GPS jitters ~5–25m while standing still. Ignore that. */
export const GPS_MOVE_METERS = 28;
/** Rebuild the walking path only after a real block of movement. */
export const ROUTE_REANCHOR_METERS = 80;

export function movedAtLeast(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  meters: number,
) {
  return distanceMeters(a, b) >= meters;
}

export function formatDistance(m: number) {
  if (m < 1000) return `${Math.round(m)} מ׳`;
  return `${(m / 1000).toFixed(1)} ק״מ`;
}
