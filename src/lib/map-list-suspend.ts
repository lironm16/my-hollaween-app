/** Map/list data + catalog updates pause while a sheet, dialog, or hunt covers the main UI. */

let appObscured = false;
let overlayCaptureDepth = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function isMapListSuspended() {
  return appObscured || overlayCaptureDepth > 0;
}

/** Full-screen capture layers (e.g. hunt camera) — map engine can unmount. */
export function isMapListOverlayCapture() {
  return overlayCaptureDepth > 0;
}

export function subscribeMapListSuspend(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function setMapListSuspended(value: boolean) {
  if (appObscured === value) return;
  appObscured = value;
  notify();
}

export function beginMapListOverlayCapture() {
  overlayCaptureDepth += 1;
  notify();
}

export function endMapListOverlayCapture() {
  overlayCaptureDepth = Math.max(0, overlayCaptureDepth - 1);
  notify();
}
