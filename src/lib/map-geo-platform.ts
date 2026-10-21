import { isAndroidLike } from "@/lib/gem-hunt-ar-platform";

/** Chrome Android / installed PWA: every consumer shares one high-accuracy watch. */
export function usesSharedAndroidGeoWatch(): boolean {
  return isAndroidLike();
}
