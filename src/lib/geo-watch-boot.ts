import { isAndroidLike } from "@/lib/gem-hunt-ar-platform";

/** Android Chrome often reports geolocation permission as "prompt" even when fixes are allowed. */
export function shouldStartGeoWatchOnBoot(
  permission: "granted" | "denied" | "prompt" | "unknown",
): boolean {
  return permission !== "denied";
}

/**
 * Only treat Permissions API "denied" as final on non-Android — Chrome Android often
 * reports denied while getCurrentPosition/watchPosition still work after grant.
 */
export function trustPermissionsQueryDenied(): boolean {
  return !isAndroidLike();
}
