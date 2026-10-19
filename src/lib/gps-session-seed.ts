import type { UserLocation } from "@/hooks/use-user-location";

const STORAGE_KEY = "hw-gps-session-seed";
const MAX_AGE_MS = 30 * 60 * 1000;

type SeedRow = UserLocation & { savedAt: number };

export function readGpsSessionSeed(): UserLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const row = JSON.parse(raw) as SeedRow;
    if (!row || typeof row.lat !== "number" || typeof row.lng !== "number") return null;
    if (Date.now() - row.savedAt > MAX_AGE_MS) return null;
    return { lat: row.lat, lng: row.lng, accuracy: row.accuracy ?? 99 };
  } catch {
    return null;
  }
}

export function writeGpsSessionSeed(location: UserLocation) {
  if (typeof window === "undefined") return;
  try {
    const row: SeedRow = { ...location, savedAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(row));
  } catch {
    /* private mode / quota */
  }
}
