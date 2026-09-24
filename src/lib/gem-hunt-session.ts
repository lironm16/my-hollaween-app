/** While gem hunt overlay is open, defer map/list/catalog UI updates until it closes. */

let sessionDepth = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function isGemHuntSessionActive() {
  return sessionDepth > 0;
}

export function subscribeGemHuntSession(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function beginGemHuntSession() {
  sessionDepth += 1;
  notify();
}

export function endGemHuntSession() {
  sessionDepth = Math.max(0, sessionDepth - 1);
  notify();
}
