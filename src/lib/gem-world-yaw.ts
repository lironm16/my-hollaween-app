import { bearingDegrees } from "@/lib/gem-hunt";

/** Tune once so the GLB “front” faces the first approach direction. */
export const GEM_WORLD_YAW_OFFSET_RAD = Math.PI;

/**
 * World-locked yaw (radians): as the viewer walks around the anchor,
 * the model shows different sides instead of billboarding toward the phone.
 */
export function gemWorldYawRad(
  anchor: { lat: number; lng: number },
  viewer: { lat: number; lng: number },
): number {
  const bearing = bearingDegrees(anchor, viewer);
  return (bearing * Math.PI) / 180 + GEM_WORLD_YAW_OFFSET_RAD;
}
