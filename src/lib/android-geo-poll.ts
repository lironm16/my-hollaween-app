import type { UserLocation } from "@/hooks/use-user-location";
import { isAndroidLike } from "@/lib/gem-hunt-ar-platform";

const POLL_MS = 1_000;

const LIVE: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 55_000,
};

const RELAXED: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 0,
  timeout: 35_000,
};

const MAX_FIX_AGE_MS = 10_000;
const STUCK_SAME_COORDS_MS = 8_000;
const STUCK_CHECK_MS = 3_000;

export type AndroidGeoFix = UserLocation & { measuredAt: number };

type Listener = (location: AndroidGeoFix) => void;

let pollTimer: number | null = null;
let stuckTimer: number | null = null;
let subscriberCount = 0;
let lastEmitted: AndroidGeoFix | null = null;
let lastCoordsKey = "";
let lastCoordsChangeAt = 0;
let pollPass = 0;
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
  const age = fixAgeMs(measuredAt);
  if (age > MAX_FIX_AGE_MS) {
    return;
  }
  if (
    lastEmitted &&
    coordsKey(lastEmitted) === key &&
    lastEmitted.accuracy === next.accuracy &&
    measuredAt <= lastEmitted.measuredAt + 250
  ) {
    return;
  }
  notify(next);
}

function readOnce(opts: PositionOptions, onDone?: () => void) {
  if (!navigator.geolocation) {
    onDone?.();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      ingest(pos);
      onDone?.();
    },
    () => {
      onDone?.();
    },
    opts,
  );
}

function pollTick() {
  if (!navigator.geolocation) return;
  pollPass += 1;
  const useRelaxed = pollPass % 4 === 0;
  readOnce(useRelaxed ? RELAXED : LIVE, () => {
    if (useRelaxed) return;
    readOnce(RELAXED);
  });
}

function resetSessionState() {
  lastEmitted = null;
  lastCoordsKey = "";
  lastCoordsChangeAt = 0;
  pollPass = 0;
}

function stopTimers() {
  if (pollTimer != null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
  if (stuckTimer != null) {
    window.clearInterval(stuckTimer);
    stuckTimer = null;
  }
}

function ensureRunning() {
  if (pollTimer != null) return;
  pollTick();
  pollTimer = window.setInterval(pollTick, POLL_MS);
  if (stuckTimer == null) {
    stuckTimer = window.setInterval(stuckCheck, STUCK_CHECK_MS);
  }
}

function stopRunning() {
  stopTimers();
}

function stuckCheck() {
  if (subscriberCount === 0) return;
  const coordsStuck =
    lastCoordsKey && Date.now() - lastCoordsChangeAt > STUCK_SAME_COORDS_MS;
  const fixOld = lastEmitted != null && fixAgeMs(lastEmitted.measuredAt) > MAX_FIX_AGE_MS;
  if (coordsStuck || fixOld) kickAndroidGeoPoll(true);
}

/** Hard reset mimics force-close + reopen (clears cached session state). */
export function kickAndroidGeoPoll(hard = false) {
  if (!isAndroidLike() || !navigator.geolocation) return;
  if (hard) {
    stopRunning();
    resetSessionState();
    ensureRunning();
    readOnce(LIVE);
    window.setTimeout(() => readOnce(LIVE), 400);
    window.setTimeout(() => readOnce(RELAXED), 900);
    return;
  }
  pollTick();
}

/** One shared Android GPS poll — map + gem hunt must not each watchPosition. */
export function subscribeAndroidGeoPoll(listener: Listener): () => void {
  if (!isAndroidLike()) return () => {};
  listeners.add(listener);
  subscriberCount += 1;
  if (lastEmitted && fixAgeMs(lastEmitted.measuredAt) <= MAX_FIX_AGE_MS) {
    listener(lastEmitted);
  } else {
    kickAndroidGeoPoll(true);
  }
  ensureRunning();
  return () => {
    listeners.delete(listener);
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0) {
      stopRunning();
      resetSessionState();
    }
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
    active: pollTimer != null,
    subscribers: subscriberCount,
    fixAgeMs: lastEmitted ? fixAgeMs(lastEmitted.measuredAt) : null,
    coordsStaleMs: lastCoordsKey ? Date.now() - lastCoordsChangeAt : null,
    lat: lastEmitted?.lat ?? null,
    lng: lastEmitted?.lng ?? null,
  };
}
