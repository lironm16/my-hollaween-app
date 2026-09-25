import type { UserLocation } from "@/hooks/use-user-location";

const STORAGE_KEY = "hw-gem-anchor-overrides";
export const GEM_ANCHOR_CHANGED_EVENT = "hw-gem-anchor-changed";

export type GemAnchorOverride = {
  lat: number;
  lng: number;
  accuracy?: number;
  updatedAt: number;
};

export type GemAnchorOverrideMap = Record<string, GemAnchorOverride>;

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(GEM_ANCHOR_CHANGED_EVENT));
}

export function loadGemAnchorOverrides(): GemAnchorOverrideMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    if (!parsed || typeof parsed !== "object") return {};
    const out: GemAnchorOverrideMap = {};
    for (const [houseId, value] of Object.entries(parsed)) {
      if (typeof value !== "object" || value === null) continue;
      const v = value as GemAnchorOverride;
      if (typeof v.lat !== "number" || typeof v.lng !== "number") continue;
      out[houseId] = {
        lat: v.lat,
        lng: v.lng,
        accuracy: typeof v.accuracy === "number" ? v.accuracy : undefined,
        updatedAt: typeof v.updatedAt === "number" ? v.updatedAt : Date.now(),
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function getGemAnchorOverride(houseId: string): GemAnchorOverride | null {
  return loadGemAnchorOverrides()[houseId] ?? null;
}

export function setGemAnchorOverride(houseId: string, location: UserLocation) {
  if (typeof window === "undefined") return;
  const all = loadGemAnchorOverrides();
  all[houseId] = {
    lat: location.lat,
    lng: location.lng,
    accuracy: location.accuracy,
    updatedAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  notify();
}

export function clearGemAnchorOverride(houseId: string) {
  if (typeof window === "undefined") return;
  const all = loadGemAnchorOverrides();
  if (!all[houseId]) return;
  delete all[houseId];
  if (Object.keys(all).length === 0) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  notify();
}

/** Remove every on-device gem anchor override (e.g. after testing away from the houses). */
export function clearAllGemAnchorOverrides() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
  notify();
}

export function countGemAnchorOverrides(): number {
  return Object.keys(loadGemAnchorOverrides()).length;
}
