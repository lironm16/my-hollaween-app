/** Leaflet pan/zoom — defer heavy main-thread work until the finger lifts. */
let active = false;
const listeners = new Set<() => void>();

export function isMapGestureActive() {
  return active;
}

export function setMapGestureActive(next: boolean) {
  if (active === next) return;
  active = next;
  for (const listener of listeners) listener();
}

export function subscribeMapGestureActive(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
