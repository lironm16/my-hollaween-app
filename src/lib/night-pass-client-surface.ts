/** How the user registered — browser tab vs installed / home-screen app. */

export type NightPassClientSurface =
  | "ios-browser"
  | "ios-app"
  | "android-browser"
  | "android-app"
  | "desktop-browser"
  | "desktop-app"
  | "other";

/** Major browser engine when registered from a browser tab (not home-screen app). */
export type NightPassClientBrowser = "safari" | "chrome" | "other";

const SURFACES = new Set<NightPassClientSurface>([
  "ios-browser",
  "ios-app",
  "android-browser",
  "android-app",
  "desktop-browser",
  "desktop-app",
  "other",
]);

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const BROWSER_VALUES = new Set<NightPassClientBrowser>(["safari", "chrome", "other"]);

export function detectNightPassClientBrowser(): NightPassClientBrowser {
  if (typeof window === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/CriOS|Chrome/i.test(ua) && !/Edg/i.test(ua)) return "chrome";
  if (/Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Edg/i.test(ua)) return "safari";
  return "other";
}

export function parseNightPassClientBrowser(raw: unknown): NightPassClientBrowser | undefined {
  if (typeof raw !== "string" || !BROWSER_VALUES.has(raw as NightPassClientBrowser)) {
    return undefined;
  }
  return raw as NightPassClientBrowser;
}

export function detectNightPassClientSurface(): NightPassClientSurface {
  if (typeof window === "undefined") return "other";
  const ua = navigator.userAgent;
  const standalone = isStandaloneDisplay();
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return standalone ? "ios-app" : "ios-browser";
  }
  if (/Android/i.test(ua)) {
    return standalone ? "android-app" : "android-browser";
  }
  return standalone ? "desktop-app" : "desktop-browser";
}

export function parseNightPassClientSurface(raw: unknown): NightPassClientSurface | undefined {
  if (typeof raw !== "string" || !SURFACES.has(raw as NightPassClientSurface)) {
    return undefined;
  }
  return raw as NightPassClientSurface;
}

/** Owner device list — דפדפן vs אפליקיה (home screen / PWA). */
export function nightPassClientSurfaceLabel(surface?: string | null): string | null {
  if (!surface) return null;
  if (
    surface === "ios-browser" ||
    surface === "android-browser" ||
    surface === "desktop-browser" ||
    surface === "other"
  ) {
    return "דפדפן";
  }
  if (surface === "ios-app" || surface === "android-app" || surface === "desktop-app") {
    return "אפליקיה";
  }
  return null;
}

/** Safari / Chrome on the device list — only when we stored it at register time. */
export function nightPassClientBrowserLabel(browser?: string | null): string | null {
  if (browser === "safari") return "Safari";
  if (browser === "chrome") return "Chrome";
  return null;
}
