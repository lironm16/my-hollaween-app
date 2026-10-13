import { appVersion } from "@/lib/app-version";
import { isAndroidUserAgent, isIosUserAgent } from "@/lib/pwa-manifest";
import type { HelpRequestPlatform } from "@/lib/help-request-schema";

function detectedPlatformFromUa(): HelpRequestPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (isAndroidUserAgent(ua)) return "android";
  if (isIosUserAgent(ua)) return "iphone";
  if (/mobile/i.test(ua)) return "other";
  return "computer";
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(nav.standalone);
}

/** Diagnostics attached to help requests — no edit codes or personal data beyond the form. */
export function collectHelpRequestContext() {
  if (typeof window === "undefined") return {};
  const neighborhoodLabel = process.env.NEXT_PUBLIC_NEIGHBORHOOD_NAME?.trim();
  return {
    appVersion: appVersion(),
    path: `${window.location.pathname}${window.location.search}`,
    referrer: typeof document !== "undefined" ? document.referrer.slice(0, 500) : "",
    online: navigator.onLine,
    standalone: isStandaloneDisplay(),
    userAgent: navigator.userAgent.slice(0, 500),
    language: navigator.language,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    detectedPlatform: detectedPlatformFromUa(),
    ...(neighborhoodLabel ? { neighborhoodLabel } : {}),
  };
}
