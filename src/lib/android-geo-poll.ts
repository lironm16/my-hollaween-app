import type { UserLocation } from "@/hooks/use-user-location";
import { distanceMeters } from "@/lib/geo";
import { isAndroidLike } from "@/lib/gem-hunt-ar-platform";

const POLL_MS = 1_000;
const MOVE_MIN_M = 0.25;

const liveOpts: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 28_000,
};

const relaxedOpts: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 10_000,
  timeout: 22_000,
};

type Listener = (location: UserLocation) => void;

let pollTimer: number | null = null;
let subscriberCount = 0;
let useRelaxed = false;
let last: UserLocation | null = null;
const listeners = new Set<Listener>();

function emit(next: UserLocation) {
  if (last && distanceMeters(last, next) < MOVE_MIN_M && last.accuracy === next.accuracy) return;
  last = next;
  for (const listener of listeners) listener(next);
}

function tick() {
  if (!navigator.geolocation) return;
  const opts = useRelaxed ? relaxedOpts : liveOpts;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      useRelaxed = false;
      emit({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
    },
    () => {
      useRelaxed = true;
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          emit({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        () => {},
        relaxedOpts,
      );
    },
    opts,
  );
}

function ensurePoll() {
  if (pollTimer != null) return;
  tick();
  pollTimer = window.setInterval(tick, POLL_MS);
}

function stopPoll() {
  if (pollTimer != null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** One shared Android GPS poll — map + gem hunt must not each call watchPosition. */
export function subscribeAndroidGeoPoll(listener: Listener): () => void {
  if (!isAndroidLike()) return () => {};
  listeners.add(listener);
  subscriberCount += 1;
  if (last) listener(last);
  ensurePoll();
  return () => {
    listeners.delete(listener);
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0) stopPoll();
  };
}

export function androidGeoPollActive() {
  return isAndroidLike() && pollTimer != null;
}
