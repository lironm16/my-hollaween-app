import type { MetadataRoute } from "next";

export function isAndroidUserAgent(userAgent: string) {
  return /android/i.test(userAgent);
}

export function isIosUserAgent(userAgent: string) {
  return /iphone|ipad|ipod/i.test(userAgent);
}

const ANDROID_ICONS: MetadataRoute.Manifest["icons"] = [
  { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
  { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

const IOS_ICONS: MetadataRoute.Manifest["icons"] = [
  { src: "/icon-ios-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icon-ios-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
];

/**
 * Chrome mints a WebAPK (and Play Protect may block it) only when display is
 * standalone / fullscreen / minimal-ui. On Android we use browser so the map
 * runs in Chrome without an install step.
 */
export function pwaManifestForUserAgent(userAgent: string): MetadataRoute.Manifest {
  const android = isAndroidUserAgent(userAgent);
  const ios = isIosUserAgent(userAgent);
  const base: MetadataRoute.Manifest = {
    name: "HallowHood",
    short_name: "HallowHood",
    description: "מפת הבתים המפחידים של השכונה, גם בלי רשת.",
    id: "/",
    dir: "rtl",
    lang: "he",
    start_url: "/",
    scope: "/",
    display: android ? "browser" : "standalone",
    orientation: "portrait",
    background_color: "#12081a",
    theme_color: "#12081a",
    prefer_related_applications: false,
    categories: ["navigation", "entertainment"],
    icons: android ? ANDROID_ICONS : ios ? IOS_ICONS : ANDROID_ICONS,
  };

  if (android) return base;

  return {
    ...base,
    handle_links: "preferred",
    launch_handler: { client_mode: ["navigate-existing", "auto"] },
  } as MetadataRoute.Manifest;
}
