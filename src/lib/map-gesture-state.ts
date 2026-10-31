/** Leaflet pan/zoom — defer heavy main-thread work until the finger lifts. */
let active = false;
const listeners = new Set<() => void>();

export function isMapGestureActive() {
  return active;
}

export function setMapGestureActive(next: boolean) {
  if (active === next) return;
  active = next;
  if (typeof window !== "undefined") {
    (window as Window & { __hwMapGestureActive?: boolean }).__hwMapGestureActive = next;
  }
  for (const listener of listeners) listener();
}

export function subscribeMapGestureActive(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
