/** How the user registered — mainly useful on iOS (Safari tab vs home-screen app). */

export type NightPassClientSurface = "ios-browser" | "ios-app" | "other";

export function detectNightPassClientSurface(): NightPassClientSurface {
  if (typeof window === "undefined") return "other";
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!ios) return "other";
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone ? "ios-app" : "ios-browser";
}

export function parseNightPassClientSurface(raw: unknown): NightPassClientSurface | undefined {
  if (raw === "ios-browser" || raw === "ios-app" || raw === "other") return raw;
  return undefined;
}

/** Short Hebrew label for owner device list — only iOS distinguishes browser vs app. */
export function nightPassClientSurfaceLabel(surface?: string | null): string | null {
  if (surface === "ios-browser") return "דפדפן (אייפון)";
  if (surface === "ios-app") return "אפליקיה (אייפון)";
  return null;
}
