export const ROUTE_MODE_KEY = "hw-route-mode";
const PENDING_RESTORE_KEY = "hw-route-pending-restore";

export function readRouteMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(ROUTE_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeRouteMode(active: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (active) sessionStorage.setItem(ROUTE_MODE_KEY, "1");
    else sessionStorage.removeItem(ROUTE_MODE_KEY);
    window.dispatchEvent(new Event("hw-route-mode"));
  } catch {
    /* private mode */
  }
}

export function queueRouteRestore(houseId: string) {
  if (typeof window === "undefined") return;
  try {
    const ids = readPendingRouteRestores();
    if (!ids.includes(houseId)) ids.push(houseId);
    sessionStorage.setItem(PENDING_RESTORE_KEY, JSON.stringify(ids));
  } catch {
    /* private mode */
  }
}

export function readPendingRouteRestores(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(PENDING_RESTORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function drainPendingRouteRestores(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const ids = readPendingRouteRestores();
    sessionStorage.removeItem(PENDING_RESTORE_KEY);
    return ids;
  } catch {
    return [];
  }
}
