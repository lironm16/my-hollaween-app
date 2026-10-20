import { isAndroidLike } from "@/lib/gem-hunt-ar-platform";

/** Chrome Android / installed PWA: one geolocation consumer; prefer polling over watchPosition. */
export function androidMapUsesGeoPolling(): boolean {
  return isAndroidLike();
}
