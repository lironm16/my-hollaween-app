export type GemSpatialMode = "studio" | "webxr";

export function isIosLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function isAndroidLike(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

/** Best primary spatial experience for this device. */
export function gemHuntPreferredSpatialMode(): GemSpatialMode {
  if (isIosLike()) return "studio";
  if (isAndroidLike()) return "webxr";
  return "studio";
}

let webxrArSupport: boolean | null = null;

/** Chrome Android immersive-ar + hit-test (cached). */
export async function supportsWebXrHitTestAr(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.xr) return false;
  if (webxrArSupport != null) return webxrArSupport;
  try {
    webxrArSupport = await navigator.xr.isSessionSupported("immersive-ar");
  } catch {
    webxrArSupport = false;
  }
  return webxrArSupport;
}

export function spatialModeLabel(mode: GemSpatialMode): string {
  return mode === "webxr" ? "AR במרחב" : "סיבוב 360°";
}
