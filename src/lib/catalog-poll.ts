import { config } from "@/lib/config";

export function catalogPollMs(seconds?: number) {
  const n = seconds ?? config.catalogPollSeconds;
  return Math.max(30, n) * 1000;
}

/** Browser tab / PWA is in the foreground (any in-app route). */
export function appInForeground() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}
