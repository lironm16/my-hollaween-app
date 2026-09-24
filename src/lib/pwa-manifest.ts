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

/** Standalone + maskable icons so Chrome Android offers full PWA install (not just a bookmark). */
export function pwaManifestForUserAgent(userAgent: string): MetadataRoute.Manifest {
  const android = isAndroidUserAgent(userAgent);
  const ios = isIosUserAgent(userAgent);
  return {
    name: "HallowHood",
    short_name: "HallowHood",
    description: "מפת הבתים המפחידים של השכונה, גם בלי רשת.",
    id: "/",
    dir: "rtl",
    lang: "he",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#12081a",
    theme_color: "#12081a",
    prefer_related_applications: false,
    categories: ["navigation", "entertainment"],
    icons: android ? ANDROID_ICONS : ios ? IOS_ICONS : ANDROID_ICONS,
    handle_links: "preferred",
    launch_handler: { client_mode: ["navigate-existing", "auto"] },
  } as MetadataRoute.Manifest;
}
