import type { UserLocation } from "@/hooks/use-user-location";
import { distanceMeters } from "@/lib/geo";
import { isAndroidLike } from "@/lib/gem-hunt-ar-platform";

const WATCH_OPTS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 60_000,
};

const BURST_OPTS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 45_000,
};

const RELAXED_BURST: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 0,
  timeout: 30_000,
};

/** Fixes older than this are treated as stale cache (matches “stuck until reopen”). */
const MAX_FIX_AGE_MS = 12_000;
/** Same coords with no fresh timestamp for this long → soft reopen (like close/open app). */
const STUCK_SAME_COORDS_MS = 14_000;
const STUCK_CHECK_MS = 4_000;

export type AndroidGeoFix = UserLocation & { measuredAt: number };

type Listener = (location: AndroidGeoFix) => void;

let watchId: number | null = null;
let stuckTimer: number | null = null;
let subscriberCount = 0;
let lastEmitted: AndroidGeoFix | null = null;
let lastCoordsKey = "";
let lastCoordsChangeAt = 0;
let lastWatchRestartAt = 0;
const listeners = new Set<Listener>();

function coordsKey(loc: Pick<UserLocation, "lat" | "lng">) {
  return `${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}`;
}

function fixAgeMs(measuredAt: number) {
  return Date.now() - measuredAt;
}

function notify(next: AndroidGeoFix) {
  lastEmitted = next;
  for (const listener of listeners) listener(next);
}

function ingest(pos: GeolocationPosition) {
  const measuredAt = pos.timestamp > 0 ? pos.timestamp : Date.now();
  const age = fixAgeMs(measuredAt);
  const next: AndroidGeoFix = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    measuredAt,
  };
  const key = coordsKey(next);
  if (key !== lastCoordsKey) {
    lastCoordsKey = key;
    lastCoordsChangeAt = Date.now();
  }
  if (age > MAX_FIX_AGE_MS) {
    void burstFreshRead();
    return;
  }
  if (
    lastEmitted &&
    coordsKey(lastEmitted) === key &&
    lastEmitted.accuracy === next.accuracy &&
    measuredAt <= lastEmitted.measuredAt + 400
  ) {
    return;
  }
  notify(next);
}

function clearWatch() {
  if (watchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

function startWatch() {
  if (!navigator.geolocation || watchId != null) return;
  watchId = navigator.geolocation.watchPosition(
    (pos) => ingest(pos),
    () => void burstFreshRead(),
    WATCH_OPTS,
  );
}

function burstFreshRead() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => ingest(pos),
    () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => ingest(pos),
        () => {},
        RELAXED_BURST,
      );
    },
    BURST_OPTS,
  );
}

/** Like closing and reopening the app — clears a stuck Android geo session. */
export function kickAndroidGeoPoll() {
  if (!isAndroidLike() || !navigator.geolocation) return;
  const now = Date.now();
  if (now - lastWatchRestartAt < 2_000) return;
  lastWatchRestartAt = now;
  clearWatch();
  burstFreshRead();
  startWatch();
}

function stuckCheck() {
  if (subscriberCount === 0) return;
  const sameCoordsStale =
    lastCoordsKey &&
    Date.now() - lastCoordsChangeAt > STUCK_SAME_COORDS_MS;
  const fixOld = lastEmitted && fixAgeMs(lastEmitted.measuredAt) > MAX_FIX_AGE_MS;
  if (sameCoordsStale || fixOld) kickAndroidGeoPoll();
}

function ensureRunning() {
  startWatch();
  burstFreshRead();
  if (stuckTimer == null) {
    stuckTimer = window.setInterval(stuckCheck, STUCK_CHECK_MS);
  }
}

function stopRunning() {
  clearWatch();
  if (stuckTimer != null) {
    window.clearInterval(stuckTimer);
    stuckTimer = null;
  }
}

/** One shared Android GPS session — map + gem hunt must not each watchPosition. */
export function subscribeAndroidGeoPoll(listener: Listener): () => void {
  if (!isAndroidLike()) return () => {};
  listeners.add(listener);
  subscriberCount += 1;
  if (lastEmitted) listener(lastEmitted);
  ensureRunning();
  return () => {
    listeners.delete(listener);
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0) stopRunning();
  };
}

export function readAndroidGeoDebug(): {
  active: boolean;
  subscribers: number;
  fixAgeMs: number | null;
  coordsStaleMs: number | null;
  lat: number | null;
  lng: number | null;
} {
  return {
    active: watchId != null,
    subscribers: subscriberCount,
    fixAgeMs: lastEmitted ? fixAgeMs(lastEmitted.measuredAt) : null,
    coordsStaleMs: lastCoordsKey ? Date.now() - lastCoordsChangeAt : null,
    lat: lastEmitted?.lat ?? null,
    lng: lastEmitted?.lng ?? null,
  };
}
