import { metersToLatDelta, metersToLngDelta } from "@/lib/line-buffer";

/** Map footprint for a specific-address point (meters). */
export const POINT_ZONE_RADIUS_M = 24;

/** Tap-to-focus radius on the map (meters). */
export const POINT_TAP_RADIUS_M = 36;

export function pointZoneCirclePolygon(
  lng: number,
  lat: number,
  radiusM = POINT_ZONE_RADIUS_M,
): GeoJSON.Polygon {
  const steps = 32;
  const ring: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const angle = (2 * Math.PI * i) / steps;
    const dLat = metersToLatDelta(radiusM) * Math.sin(angle);
    const dLng = metersToLngDelta(radiusM, lat) * Math.cos(angle);
    ring.push([lng + dLng, lat + dLat]);
  }
  ring.push(ring[0]!);
  return { type: "Polygon", coordinates: [ring] };
}
