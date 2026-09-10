import { distanceMeters } from "@/lib/geo";
import type { LatLng } from "@/lib/route";

function closestIndexOnLine(line: LatLng[], point: LatLng): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < line.length; i++) {
    const d = distanceMeters(line[i], point);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Walking path from route start through the given stop index (inclusive). */
export function sliceRouteLineToStop(line: LatLng[], stops: LatLng[], stopIndex: number): LatLng[] {
  if (!line.length || stopIndex < 0) return [];
  const target = stops[stopIndex];
  if (!target) return line.slice(0, 1);
  const endIdx = closestIndexOnLine(line, target);
  return line.slice(0, Math.max(1, endIdx + 1));
}

function lineLengthMeters(line: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < line.length; i++) {
    total += distanceMeters(line[i - 1], line[i]);
  }
  return total;
}

/** Partial path for animated green line reveal (0 = start only, 1 = full slice). */
export function revealRouteLineSlice(line: LatLng[], progress: number): LatLng[] {
  if (!line.length) return [];
  if (progress >= 1) return line;
  if (progress <= 0) return [line[0]];
  if (line.length < 2) return line;

  const target = lineLengthMeters(line) * progress;
  let walked = 0;
  const out: LatLng[] = [line[0]];

  for (let i = 1; i < line.length; i++) {
    const seg = distanceMeters(line[i - 1], line[i]);
    if (walked + seg >= target) {
      const t = seg > 0 ? (target - walked) / seg : 0;
      out.push({
        lat: line[i - 1].lat + (line[i].lat - line[i - 1].lat) * t,
        lng: line[i - 1].lng + (line[i].lng - line[i - 1].lng) * t,
      });
      return out;
    }
    walked += seg;
    out.push(line[i]);
  }
  return line;
}
