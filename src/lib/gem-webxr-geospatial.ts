import { bearingDegrees } from "@/lib/gem-hunt";
import { distanceMeters } from "@/lib/geo";

/** Same sidewalk anchor as iOS camera hunt — shared target lat/lng. */
export type GeoPlacementTarget = { lat: number; lng: number };

export type GeoPlacementSample = {
  lat: number;
  lng: number;
  accuracy?: number;
};

/** East / north offset in meters (WGS84 tangent plane). */
export function eastNorthOffsetMeters(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): { east: number; north: number } {
  const R = 6371000;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const latMid = (((from.lat + to.lat) / 2) * Math.PI) / 180;
  const north = dLat * R;
  const east = dLng * R * Math.cos(latMid);
  return { east, north };
}

/** Horizontal distance + bearing from user to anchor (walk plane). */
export function horizontalRangeToAnchor(
  user: { lat: number; lng: number },
  target: GeoPlacementTarget,
) {
  return {
    distanceM: distanceMeters(user, target),
    bearingDeg: bearingDegrees(user, target),
  };
}

/** Offset in viewer-local meters (Y up, forward ≈ −Z when heading matches compass). */
export function viewerLocalOffsetMeters(
  user: GeoPlacementSample,
  target: GeoPlacementTarget,
  deviceHeadingDeg: number,
): { x: number; z: number; distanceM: number; quality: "good" | "weak" } {
  const { distanceM, bearingDeg } = horizontalRangeToAnchor(user, target);
  let rel = bearingDeg - deviceHeadingDeg;
  while (rel > 180) rel -= 360;
  while (rel < -180) rel += 360;
  const rad = (rel * Math.PI) / 180;
  const x = distanceM * Math.sin(rad);
  const z = -distanceM * Math.cos(rad);
  const acc = user.accuracy;
  const quality =
    acc != null && Number.isFinite(acc) && acc > 28 ? "weak" : "good";
  return { x, z, distanceM, quality };
}

export function averageGeoSamples(samples: GeoPlacementSample[]): GeoPlacementSample | null {
  if (samples.length === 0) return null;
  let lat = 0;
  let lng = 0;
  let accSum = 0;
  let accN = 0;
  for (const s of samples) {
    lat += s.lat;
    lng += s.lng;
    if (s.accuracy != null && Number.isFinite(s.accuracy)) {
      accSum += s.accuracy;
      accN += 1;
    }
  }
  return {
    lat: lat / samples.length,
    lng: lng / samples.length,
    accuracy: accN > 0 ? accSum / accN : undefined,
  };
}

export function geoSampleSpreadMeters(samples: GeoPlacementSample[]): number {
  if (samples.length < 2) return 0;
  let max = 0;
  for (let i = 0; i < samples.length; i += 1) {
    for (let j = i + 1; j < samples.length; j += 1) {
      max = Math.max(max, distanceMeters(samples[i]!, samples[j]!));
    }
  }
  return max;
}

/** Ready to lock pet at map anchor (tight GPS + compass). */
export function geoPlacementReady(
  samples: GeoPlacementSample[],
  headingDeg: number | null,
  target: GeoPlacementTarget,
  maxSpreadM = 8,
  maxAccuracyM = 22,
): boolean {
  if (headingDeg == null || !Number.isFinite(headingDeg)) return false;
  if (samples.length < 3) return false;
  const avg = averageGeoSamples(samples);
  if (!avg) return false;
  if (avg.accuracy != null && avg.accuracy > maxAccuracyM) return false;
  if (geoSampleSpreadMeters(samples) > maxSpreadM) return false;
  return distanceMeters(avg, target) <= 15.5;
}

type XRFrameGeo = XRFrame & {
  createGeospatialAnchor?: (options: {
    latitude: number;
    longitude: number;
    altitude?: number;
    altitudeMode?: "terrain" | "rooftop" | "wgs84";
  }) => Promise<XRAnchor>;
};

/** Probe ARCore Geospatial when Chrome exposes it (forward-compatible). */
export async function tryCreateNativeGeospatialAnchor(
  frame: XRFrame,
  target: GeoPlacementTarget,
): Promise<XRAnchor | null> {
  const create = (frame as XRFrameGeo).createGeospatialAnchor;
  if (!create) return null;
  try {
    return await create.call(frame, {
      latitude: target.lat,
      longitude: target.lng,
      altitudeMode: "terrain",
    });
  } catch {
    return null;
  }
}

export function rigidTransformFromViewerOffset(x: number, y: number, z: number): XRRigidTransform {
  return new XRRigidTransform({ x, y, z }, { w: 1, x: 0, y: 0, z: 0 });
}
