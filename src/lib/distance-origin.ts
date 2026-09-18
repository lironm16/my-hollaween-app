import { config } from "@/lib/config";

export const DISTANCE_ORIGIN_KEY = "hw-distance-origin";
export const DISTANCE_ORIGIN_EVENT = "hw-distance-origin";

export type DistanceOriginChoice =
  | { kind: "gps"; lat?: number; lng?: number; savedAt?: string }
  | { kind: "neighborhood" }
  | { kind: "custom"; lat: number; lng: number; label: string };

export type ResolvedOrigin = {
  kind: DistanceOriginChoice["kind"];
  lat: number;
  lng: number;
  label: string;
  fromGps: boolean;
};

const neighborhoodPoint = {
  lat: config.map.center.lat,
  lng: config.map.center.lng,
};

export function neighborhoodOrigin(): ResolvedOrigin {
  return {
    kind: "neighborhood",
    lat: neighborhoodPoint.lat,
    lng: neighborhoodPoint.lng,
    label: "ממרכז השכונה",
    fromGps: false,
  };
}

export function originLabel(choice: DistanceOriginChoice): string {
  if (choice.kind === "custom") return choice.label || "מנקודה במפה";
  if (choice.kind === "neighborhood") return "ממרכז השכונה";
  return "מיקום נוכחי";
}

export function resolveDistanceOrigin(
  choice: DistanceOriginChoice,
  gps: { lat: number; lng: number } | null | undefined,
): ResolvedOrigin {
  if (choice.kind === "custom" && Number.isFinite(choice.lat) && Number.isFinite(choice.lng)) {
    return {
      kind: "custom",
      lat: choice.lat,
      lng: choice.lng,
      label: choice.label || "מנקודה במפה",
      fromGps: false,
    };
  }
  if (choice.kind === "neighborhood") return neighborhoodOrigin();
  if (choice.kind === "gps") {
    if (gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lng)) {
      return {
        kind: "gps",
        lat: gps.lat,
        lng: gps.lng,
        label: "מיקום נוכחי",
        fromGps: true,
      };
    }
    if (Number.isFinite(choice.lat) && Number.isFinite(choice.lng)) {
      return {
        kind: "gps",
        lat: choice.lat,
        lng: choice.lng,
        label: "מיקום נוכחי",
        fromGps: true,
      };
    }
    return {
      kind: "gps",
      lat: neighborhoodPoint.lat,
      lng: neighborhoodPoint.lng,
      label: "מיקום נוכחי",
      fromGps: false,
    };
  }
  return neighborhoodOrigin();
}

function isChoice(value: unknown): value is DistanceOriginChoice {
  if (!value || typeof value !== "object") return false;
  const kind = (value as DistanceOriginChoice).kind;
  if (kind === "neighborhood") return true;
  if (kind === "gps") {
    const gps = value as Extract<DistanceOriginChoice, { kind: "gps" }>;
    if (gps.lat !== undefined && !Number.isFinite(gps.lat)) return false;
    if (gps.lng !== undefined && !Number.isFinite(gps.lng)) return false;
    return true;
  }
  if (kind !== "custom") return false;
  const custom = value as Extract<DistanceOriginChoice, { kind: "custom" }>;
  return Number.isFinite(custom.lat) && Number.isFinite(custom.lng);
}

const DEFAULT_GPS: DistanceOriginChoice = { kind: "gps" };

let cachedRaw: string | null | undefined;
let cachedChoice: DistanceOriginChoice = DEFAULT_GPS;

export function readDistanceOrigin(): DistanceOriginChoice {
  if (typeof window === "undefined") return DEFAULT_GPS;
  try {
    const raw =
      localStorage.getItem(DISTANCE_ORIGIN_KEY) ?? sessionStorage.getItem(DISTANCE_ORIGIN_KEY);
    if (raw === cachedRaw) return cachedChoice;
    cachedRaw = raw;
    if (!raw) {
      cachedChoice = DEFAULT_GPS;
      return cachedChoice;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (isChoice(parsed)) {
      cachedChoice = parsed;
      return cachedChoice;
    }
  } catch {
    /* private mode / bad json */
  }
  cachedRaw = null;
  cachedChoice = DEFAULT_GPS;
  return cachedChoice;
}

/** Keep the last GPS fix with a gps origin choice so cold starts don't fall back to map center. */
export function touchGpsOriginCache(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const current = readDistanceOrigin();
  if (current.kind !== "gps") return;
  if (current.lat === lat && current.lng === lng) return;
  writeDistanceOrigin({ kind: "gps", lat, lng, savedAt: new Date().toISOString() });
}

export function writeDistanceOrigin(choice: DistanceOriginChoice) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(choice);
  try {
    sessionStorage.setItem(DISTANCE_ORIGIN_KEY, raw);
    localStorage.setItem(DISTANCE_ORIGIN_KEY, raw);
  } catch {
    /* private mode */
  }
  cachedRaw = raw;
  cachedChoice = choice;
  window.dispatchEvent(new Event(DISTANCE_ORIGIN_EVENT));
}
