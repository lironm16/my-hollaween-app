/** Android Chrome often reports geolocation permission as "prompt" even when fixes are allowed. */
export function shouldStartGeoWatchOnBoot(
  permission: "granted" | "denied" | "prompt" | "unknown",
): boolean {
  return permission !== "denied";
}
