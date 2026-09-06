import { config } from "@/lib/config";

export const DISTANCE_ORIGIN_KEY = "hw-distance-origin";
export const DISTANCE_ORIGIN_EVENT = "hw-distance-origin";

export type DistanceOriginChoice =
  | { kind: "gps" }
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
  return "מהמיקום שלכם";
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
  if (gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lng)) {
    return {
      kind: "gps",
      lat: gps.lat,
      lng: gps.lng,
      label: "מהמיקום שלכם",
      fromGps: true,
    };
  }
  return { ...neighborhoodOrigin(), kind: choice.kind === "gps" ? "gps" : "neighborhood" };
}

function isChoice(value: unknown): value is DistanceOriginChoice {
  if (!value || typeof value !== "object") return false;
  const kind = (value as DistanceOriginChoice).kind;
  if (kind === "gps" || kind === "neighborhood") return true;
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
    const raw = sessionStorage.getItem(DISTANCE_ORIGIN_KEY);
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

export function writeDistanceOrigin(choice: DistanceOriginChoice) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DISTANCE_ORIGIN_KEY, JSON.stringify(choice));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(DISTANCE_ORIGIN_EVENT));
}
