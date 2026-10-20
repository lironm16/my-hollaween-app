/** Meters → degrees latitude (approx). */
function metersToLatDelta(m: number): number {
  return (m / 6371000) * (180 / Math.PI);
}

/** Meters → degrees longitude at latitude. */
function metersToLngDelta(m: number, lat: number): number {
  return metersToLatDelta(m) / Math.max(Math.cos((lat * Math.PI) / 180), 1e-6);
}

function bearingDegrees(from: [number, number], to: [number, number]): number {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function offsetPoint(lng: number, lat: number, bearingDeg: number, distM: number): [number, number] {
  const R = 6371000;
  const brng = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const δ = distM / R;
  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);
  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(brng);
  const φ2 = Math.asin(sinφ2);
  const λ2 =
    λ1 + Math.atan2(Math.sin(brng) * sinδ * cosφ1, cosδ - sinφ1 * Math.sin(φ2));
  return [(λ2 * 180) / Math.PI, (φ2 * 180) / Math.PI];
}

/**
 * Buffer a polyline (GeoJSON order [lng, lat]) into a closed polygon ring.
 * @param halfWidthM half-width of corridor (e.g. 35 → ~70 m street envelope).
 */
export function bufferPolylineLngLat(
  line: [number, number][],
  halfWidthM: number,
): [number, number][] | null {
  if (line.length < 2 || halfWidthM <= 0) return null;
  const left: [number, number][] = [];
  const right: [number, number][] = [];

  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    const brg = bearingDegrees(a, b);
    const perpL = brg + 90;
    const perpR = brg - 90;
    left.push(offsetPoint(a[0], a[1], perpL, halfWidthM));
    right.push(offsetPoint(a[0], a[1], perpR, halfWidthM));
    if (i === line.length - 2) {
      left.push(offsetPoint(b[0], b[1], perpL, halfWidthM));
      right.push(offsetPoint(b[0], b[1], perpR, halfWidthM));
    }
  }

  const ring = [...left, ...right.reverse()];
  if (ring.length < 3) return null;
  ring.push(ring[0]);
  return ring;
}

export { metersToLatDelta, metersToLngDelta };
