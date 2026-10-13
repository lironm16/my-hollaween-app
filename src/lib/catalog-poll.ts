/** Read poll interval from env at call time (Vercel runtime vars, not build bake-in). */
export function readCatalogPollSeconds() {
  return Math.max(
    30,
    Number(process.env.CATALOG_POLL_SECONDS ?? process.env.NEXT_PUBLIC_CATALOG_POLL_SECONDS ?? 180) ||
      180,
  );
}

export function catalogPollMs(seconds?: number) {
  const n = seconds ?? readCatalogPollSeconds();
  return Math.max(30, n) * 1000;
}

/** Server-suggested poll interval (same day and night — catalog deletes must reach peers quickly). */
export function effectiveCatalogPollSeconds(_now = new Date()) {
  return readCatalogPollSeconds();
}

const ADAPTIVE_POLL_MAX_SECONDS = 900;

/** Stretch idle foreground polls after consecutive empty deltas (#8). */
export function adaptiveCatalogPollMs(baseSeconds: number, consecutiveEmptyDeltas: number) {
  const base = Math.max(30, baseSeconds);
  if (consecutiveEmptyDeltas < 3) return base * 1000;
  if (consecutiveEmptyDeltas < 6) return Math.min(ADAPTIVE_POLL_MAX_SECONDS, Math.round(base * 1.5)) * 1000;
  return Math.min(ADAPTIVE_POLL_MAX_SECONDS, base * 2) * 1000;
}

/** Browser tab / PWA is in the foreground (any in-app route). */
export function appInForeground() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}
