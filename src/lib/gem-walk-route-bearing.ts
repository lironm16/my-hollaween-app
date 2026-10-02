import { bearingDegrees, relativeWalkBearingDeg } from "@/lib/gem-hunt";
import { distanceMeters } from "@/lib/geo";
import type { LatLng } from "@/lib/route";

const LOOK_AHEAD_METERS = 10;

/** Closest vertex on the walking polyline. */
function closestRouteIndex(user: LatLng, route: LatLng[]): number {
  let bestIdx = 0;
  let bestD = Infinity;
  for (let i = 0; i < route.length; i++) {
    const d = distanceMeters(user, route[i]!);
    if (d < bestD) {
      bestD = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Target point ~LOOK_AHEAD_METERS ahead on the route (street-following, not through buildings). */
export function walkRouteLookaheadTarget(user: LatLng, route: LatLng[]): LatLng | null {
  if (route.length < 2) return null;
  const startIdx = closestRouteIndex(user, route);
  let acc = 0;
  for (let i = startIdx; i < route.length - 1; i++) {
    const seg = distanceMeters(route[i]!, route[i + 1]!);
    acc += seg;
    if (acc >= LOOK_AHEAD_METERS) return route[i + 1]!;
  }
  return route[route.length - 1]!;
}

/** Phone-relative turn angle for hunt arrow — follows OSRM walk route. */
export function walkRouteTurnBearingDeg(
  user: LatLng,
  deviceHeading: number | null,
  route: LatLng[] | null,
): number | null {
  if (deviceHeading == null || !route || route.length < 2) return null;
  const target = walkRouteLookaheadTarget(user, route);
  if (!target) return null;
  return relativeWalkBearingDeg(user, target, deviceHeading);
}

/** Map-north bearing fallback when compass unavailable. */
export function walkRouteMapBearingDeg(user: LatLng, route: LatLng[] | null): number | null {
  if (!route || route.length < 2) return null;
  const target = walkRouteLookaheadTarget(user, route);
  if (!target) return null;
  return bearingDegrees(user, target);
}
