import type { UserLocation } from "@/hooks/use-user-location";

const SESSION_KEY = "hw-gps-session-seed";
const LOCAL_KEY = "hw-gps-last-fix";
const SESSION_MAX_AGE_MS = 30 * 60 * 1000;
/** Installed PWA on Android often clears sessionStorage between launches. */
const LOCAL_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type SeedRow = UserLocation & { savedAt: number };

function parseSeedRow(raw: string | null, maxAgeMs: number): UserLocation | null {
  if (!raw) return null;
  try {
    const row = JSON.parse(raw) as SeedRow;
    if (!row || typeof row.lat !== "number" || typeof row.lng !== "number") return null;
    if (Date.now() - row.savedAt > maxAgeMs) return null;
    return { lat: row.lat, lng: row.lng, accuracy: row.accuracy ?? 99, measuredAt: row.measuredAt };
  } catch {
    return null;
  }
}

export function readGpsSessionSeed(): UserLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const session = parseSeedRow(sessionStorage.getItem(SESSION_KEY), SESSION_MAX_AGE_MS);
    if (session) return session;
    return parseSeedRow(localStorage.getItem(LOCAL_KEY), LOCAL_MAX_AGE_MS);
  } catch {
    return null;
  }
}

export function writeGpsSessionSeed(location: UserLocation) {
  if (typeof window === "undefined") return;
  const row: SeedRow = { ...location, savedAt: Date.now() };
  const raw = JSON.stringify(row);
  try {
    sessionStorage.setItem(SESSION_KEY, raw);
  } catch {
    /* private mode / quota */
  }
  try {
    localStorage.setItem(LOCAL_KEY, raw);
  } catch {
    /* ignore */
  }
}

/** Drop cached dot before a hard GPS refresh (Android stuck on old seed). */
export function clearGpsSessionSeed() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* ignore */
  }
}
