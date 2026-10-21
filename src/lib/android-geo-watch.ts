import type { UserLocation } from "@/hooks/use-user-location";
import { isAndroidLike } from "@/lib/gem-hunt-ar-platform";

/**
 * One long-lived high-accuracy watch shared by the map and gem hunt on Android.
 *
 * Chrome Android restarts its fused location provider whenever the set of pending
 * requests changes accuracy, or when the last request ends, and every restart first
 * replays the OS "last known" fix. Polling getCurrentPosition, mixing
 * enableHighAccuracy true/false, or tearing the watch down on a timer keeps the
 * provider cold and the dot frozen on that replayed fix. Keep exactly one
 * high-accuracy watch alive and only restart it on errors, silence, or resume.
 */
const WATCH_OPTS: PositionOptions = { enableHighAccuracy: true, maximumAge: 0 };

const SILENCE_RESTART_MS = 30_000;
const ERROR_RESTART_MS = 2_000;
const MIN_RESTART_GAP_MS = 5_000;
/** Map ↔ gem hunt hand-off unsubscribes then resubscribes; don't bounce the provider. */
const IDLE_STOP_GRACE_MS = 5_000;
const FRESH_REPLAY_MS = 5_000;

export type AndroidGeoFix = UserLocation & { measuredAt: number };

type Subscriber = {
  onFix: (location: AndroidGeoFix) => void;
  onDenied?: () => void;
};

let watchId: number | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;
let restartTimer: ReturnType<typeof setTimeout> | null = null;
let idleStopTimer: ReturnType<typeof setTimeout> | null = null;
let lastEmitted: AndroidGeoFix | null = null;
let lastReceivedAt = 0;
let lastCallbackAt = 0;
let lastRestartAt = 0;
let lastCoordsKey = "";
let lastCoordsChangeAt = 0;
let visibilityHooked = false;
let callbackCount = 0;
let restartCount = 0;
let lastErrorCode: number | null = null;
let lastTimestampSkewMs: number | null = null;
const subscribers = new Set<Subscriber>();
const waiters = new Set<(location: AndroidGeoFix) => void>();

function geo(): Geolocation | null {
  if (typeof navigator === "undefined") return null;
  return navigator.geolocation ?? null;
}

function coordsKey(loc: Pick<UserLocation, "lat" | "lng">) {
  return `${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}`;
}

function onPosition(pos: GeolocationPosition) {
  const now = Date.now();
  lastCallbackAt = now;
  callbackCount += 1;
  // Android GPS fixes can carry a timestamp skewed from Date.now() (GPS vs system clock),
  // so filtering on pos.timestamp silently drops every real GPS fix. Use arrival time.
  lastTimestampSkewMs = pos.timestamp > 0 ? pos.timestamp - now : null;
  const measuredAt = now;
  const next: AndroidGeoFix = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    measuredAt,
  };
  const key = coordsKey(next);
  if (key !== lastCoordsKey) {
    lastCoordsKey = key;
    lastCoordsChangeAt = now;
  }
  lastReceivedAt = now;
  const unchanged =
    lastEmitted && coordsKey(lastEmitted) === key && lastEmitted.accuracy === next.accuracy;
  lastEmitted = next;
  if (!unchanged) {
    for (const sub of subscribers) sub.onFix(next);
  }
  for (const waiter of [...waiters]) waiter(next);
}

function onError(err: GeolocationPositionError) {
  lastCallbackAt = Date.now();
  lastErrorCode = err.code;
  if (err.code === 1) {
    stopWatch();
    for (const sub of subscribers) sub.onDenied?.();
    return;
  }
  scheduleRestart(ERROR_RESTART_MS);
}

function startWatch() {
  const g = geo();
  if (!g || watchId != null) return;
  lastCallbackAt = Date.now();
  watchId = g.watchPosition(onPosition, onError, WATCH_OPTS);
  if (watchdogTimer == null) {
    watchdogTimer = setInterval(() => {
      if (watchId != null && Date.now() - lastCallbackAt > SILENCE_RESTART_MS) {
        restartAndroidGeoWatch();
      }
    }, SILENCE_RESTART_MS / 3);
  }
}

function stopWatch() {
  const g = geo();
  if (watchId != null) g?.clearWatch(watchId);
  watchId = null;
  if (watchdogTimer != null) clearInterval(watchdogTimer);
  watchdogTimer = null;
  if (restartTimer != null) clearTimeout(restartTimer);
  restartTimer = null;
}

function scheduleRestart(delayMs: number) {
  if (restartTimer != null) return;
  restartTimer = setTimeout(() => {
    restartTimer = null;
    restartAndroidGeoWatch();
  }, delayMs);
}

function onVisibility() {
  if (typeof document === "undefined" || document.visibilityState !== "visible") return;
  if (subscribers.size > 0) restartAndroidGeoWatch();
}

function hookVisibility() {
  if (visibilityHooked || typeof document === "undefined") return;
  visibilityHooked = true;
  document.addEventListener("visibilitychange", onVisibility);
}

/** Rate-limited clearWatch + watchPosition (Chrome may drop watches while backgrounded). */
export function restartAndroidGeoWatch() {
  if (!isAndroidLike() || !geo() || subscribers.size === 0) return;
  const sinceLast = Date.now() - lastRestartAt;
  if (sinceLast < MIN_RESTART_GAP_MS) {
    scheduleRestart(MIN_RESTART_GAP_MS - sinceLast);
    return;
  }
  lastRestartAt = Date.now();
  restartCount += 1;
  stopWatch();
  startWatch();
}

export function subscribeAndroidGeo(
  onFix: (location: AndroidGeoFix) => void,
  onDenied?: () => void,
): () => void {
  if (!isAndroidLike() || !geo()) return () => {};
  const sub: Subscriber = { onFix, onDenied };
  subscribers.add(sub);
  if (idleStopTimer != null) {
    clearTimeout(idleStopTimer);
    idleStopTimer = null;
  }
  hookVisibility();
  if (lastEmitted) onFix(lastEmitted);
  startWatch();
  return () => {
    if (!subscribers.delete(sub) || subscribers.size > 0) return;
    if (idleStopTimer != null) clearTimeout(idleStopTimer);
    idleStopTimer = setTimeout(() => {
      idleStopTimer = null;
      if (subscribers.size === 0) stopWatch();
    }, IDLE_STOP_GRACE_MS);
  };
}

/** Next fix from the shared watch (or a just-received one); never opens a second request. */
export function readAndroidGeoFix(timeoutMs: number): Promise<AndroidGeoFix | "denied" | null> {
  return new Promise((resolve) => {
    if (!isAndroidLike() || !geo()) {
      resolve(null);
      return;
    }
    if (lastEmitted && Date.now() - lastReceivedAt <= FRESH_REPLAY_MS) {
      const fresh = lastEmitted;
      const unsub = subscribeAndroidGeo(() => {});
      setTimeout(unsub, 0);
      resolve(fresh);
      return;
    }
    let done = false;
    let unsub: () => void = () => {};
    const waiter = (fix: AndroidGeoFix) => finish(fix);
    const finish = (value: AndroidGeoFix | "denied" | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      waiters.delete(waiter);
      setTimeout(() => unsub(), 0);
      resolve(value);
    };
    const timer = setTimeout(() => finish(lastEmitted), timeoutMs);
    waiters.add(waiter);
    unsub = subscribeAndroidGeo(
      () => {},
      () => finish("denied"),
    );
  });
}

export function readAndroidGeoDebug(): {
  active: boolean;
  subscribers: number;
  fixAgeMs: number | null;
  coordsStaleMs: number | null;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  callbacks: number;
  restarts: number;
  lastErrorCode: number | null;
  timestampSkewMs: number | null;
} {
  return {
    active: watchId != null,
    subscribers: subscribers.size,
    fixAgeMs: lastEmitted ? Date.now() - lastEmitted.measuredAt : null,
    coordsStaleMs: lastCoordsKey ? Date.now() - lastCoordsChangeAt : null,
    lat: lastEmitted?.lat ?? null,
    lng: lastEmitted?.lng ?? null,
    accuracy: lastEmitted?.accuracy ?? null,
    callbacks: callbackCount,
    restarts: restartCount,
    lastErrorCode,
    timestampSkewMs: lastTimestampSkewMs,
  };
}

/** Test-only: drop module state between cases. */
export function resetAndroidGeoWatchForTests() {
  stopWatch();
  if (idleStopTimer != null) clearTimeout(idleStopTimer);
  idleStopTimer = null;
  subscribers.clear();
  waiters.clear();
  lastEmitted = null;
  lastReceivedAt = 0;
  lastCallbackAt = 0;
  lastRestartAt = 0;
  lastCoordsKey = "";
  lastCoordsChangeAt = 0;
  callbackCount = 0;
  restartCount = 0;
  lastErrorCode = null;
  lastTimestampSkewMs = null;
}
