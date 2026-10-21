import type { UserLocation } from "@/hooks/use-user-location";
import { isAndroidLike } from "@/lib/gem-hunt-ar-platform";

/**
 * Shared Android location feed for map + gem hunt.
 *
 * Some Android configs (often Wi‑Fi / hotspot, no SIM) never deliver watchPosition
 * callbacks (cb stays 0) but getCurrentPosition does work. Use one high-accuracy
 * poll at a time — never overlap requests or mix accuracy modes (that froze the dot).
 */
const POLL_GAP_MS = 2_000;
const POLL_OPTS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 25_000,
};

const IDLE_STOP_GRACE_MS = 5_000;
const FRESH_REPLAY_MS = 5_000;

export type AndroidGeoFix = UserLocation & { measuredAt: number };

type Subscriber = {
  onFix: (location: AndroidGeoFix) => void;
  onDenied?: () => void;
};

let pollTimer: ReturnType<typeof setTimeout> | null = null;
let pollInFlight = false;
let running = false;
let idleStopTimer: ReturnType<typeof setTimeout> | null = null;
let lastEmitted: AndroidGeoFix | null = null;
let lastReceivedAt = 0;
let lastCoordsKey = "";
let lastCoordsChangeAt = 0;
let visibilityHooked = false;
let callbackCount = 0;
let pollErrors = 0;
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

function ingest(pos: GeolocationPosition) {
  const now = Date.now();
  callbackCount += 1;
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

function onPollError(err: GeolocationPositionError) {
  pollErrors += 1;
  lastErrorCode = err.code;
  if (err.code === 1) {
    stopPolling();
    for (const sub of subscribers) sub.onDenied?.();
  }
}

function schedulePoll(delayMs = POLL_GAP_MS) {
  if (!running || subscribers.size === 0 || pollTimer != null) return;
  pollTimer = setTimeout(() => {
    pollTimer = null;
    pollOnce();
  }, delayMs);
}

function pollOnce() {
  if (!running || subscribers.size === 0) return;
  if (pollInFlight) {
    schedulePoll(POLL_GAP_MS);
    return;
  }
  const g = geo();
  if (!g) return;
  pollInFlight = true;
  g.getCurrentPosition(
    (pos) => {
      pollInFlight = false;
      ingest(pos);
      schedulePoll(POLL_GAP_MS);
    },
    (err) => {
      pollInFlight = false;
      onPollError(err);
      if (subscribers.size > 0 && err.code !== 1) schedulePoll(POLL_GAP_MS);
    },
    POLL_OPTS,
  );
}

function startPolling() {
  if (running) return;
  running = true;
  pollOnce();
}

function stopPolling() {
  running = false;
  pollInFlight = false;
  if (pollTimer != null) clearTimeout(pollTimer);
  pollTimer = null;
}

function onVisibility() {
  if (typeof document === "undefined" || document.visibilityState !== "visible") return;
  if (subscribers.size > 0 && running) pollOnce();
}

function hookVisibility() {
  if (visibilityHooked || typeof document === "undefined") return;
  visibilityHooked = true;
  document.addEventListener("visibilitychange", onVisibility);
}

/** Immediate poll (e.g. map open / resume). Does not reset session state. */
export function restartAndroidGeoWatch() {
  if (!isAndroidLike() || !geo() || subscribers.size === 0) return;
  if (!running) startPolling();
  else pollOnce();
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
  startPolling();
  return () => {
    if (!subscribers.delete(sub) || subscribers.size > 0) return;
    if (idleStopTimer != null) clearTimeout(idleStopTimer);
    idleStopTimer = setTimeout(() => {
      idleStopTimer = null;
      if (subscribers.size === 0) stopPolling();
    }, IDLE_STOP_GRACE_MS);
  };
}

export function readAndroidGeoFix(timeoutMs: number): Promise<AndroidGeoFix | "denied" | null> {
  return new Promise((resolve) => {
    if (!isAndroidLike() || !geo()) {
      resolve(null);
      return;
    }
    if (lastEmitted && Date.now() - lastReceivedAt <= FRESH_REPLAY_MS) {
      resolve(lastEmitted);
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
    active: running,
    subscribers: subscribers.size,
    fixAgeMs: lastEmitted ? Date.now() - lastEmitted.measuredAt : null,
    coordsStaleMs: lastCoordsKey ? Date.now() - lastCoordsChangeAt : null,
    lat: lastEmitted?.lat ?? null,
    lng: lastEmitted?.lng ?? null,
    accuracy: lastEmitted?.accuracy ?? null,
    callbacks: callbackCount,
    restarts: pollErrors,
    lastErrorCode,
    timestampSkewMs: lastTimestampSkewMs,
  };
}

/** Test-only: drop module state between cases. */
export function resetAndroidGeoWatchForTests() {
  stopPolling();
  if (idleStopTimer != null) clearTimeout(idleStopTimer);
  idleStopTimer = null;
  subscribers.clear();
  waiters.clear();
  lastEmitted = null;
  lastReceivedAt = 0;
  lastCoordsKey = "";
  lastCoordsChangeAt = 0;
  callbackCount = 0;
  pollErrors = 0;
  lastErrorCode = null;
  lastTimestampSkewMs = null;
}
