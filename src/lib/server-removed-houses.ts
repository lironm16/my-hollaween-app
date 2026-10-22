import { clearCatalogRemoved, loadCatalogRemovedEntries, noteCatalogRemovals } from "@/lib/catalog-removed";

/**
 * House ids the live server explicitly reported as deleted (`removed` on `/api/catalog`, or a 404
 * for a house this device saved). Merges keep local rows missing from shorter lists, so a deletion
 * must be remembered here or the device cache brings the house back. Only explicit server signals
 * land here — never absence from a list.
 */
const SERVER_REMOVED_KEY = "hw-server-removed-houses";
const MAX_ENTRIES = 300;

export function loadServerRemovedHouseIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SERVER_REMOVED_KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string" && Boolean(id)) : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  try {
    localStorage.setItem(SERVER_REMOVED_KEY, JSON.stringify(ids.slice(0, MAX_ENTRIES)));
  } catch {
    /* private mode */
  }
}

function updateIds(removed: string[], listed: Set<string>) {
  const current = loadServerRemovedHouseIds();
  const kept = current.filter((id) => !listed.has(id) && !removed.includes(id));
  const next = [...removed, ...kept];
  if (next.length === current.length && next.every((id, i) => id === current[i])) return;
  writeIds(next);
}

/**
 * Apply one live server response: rows it returns are listed right now (restored houses come back),
 * explicit `removed` ids stay hidden on this device until the server lists them again.
 * Also drives the **removed from guide** label, whichever refresh path delivered the response.
 */
export function recordLiveCatalogRemovals(live: {
  houses?: Array<{ id: string }>;
  removed?: string[];
  updatedAt?: string;
}) {
  if (typeof window === "undefined") return;
  const listed = new Set((live.houses ?? []).map((house) => house.id));
  const removed = (live.removed ?? []).filter((id) => id && !listed.has(id));
  updateIds(removed, listed);
  if (removed.length > 0) noteCatalogRemovals(removed, live.updatedAt ?? new Date().toISOString());
  for (const entry of loadCatalogRemovedEntries()) {
    if (listed.has(entry.id)) clearCatalogRemoved(entry.id);
  }
}

/** Saved houses the server answered 404 for — deleted on the server, possibly before this device last synced. */
export function noteServerRemovedHouses(ids: string[]) {
  if (typeof window === "undefined") return;
  const gone = ids.filter(Boolean);
  if (gone.length === 0) return;
  updateIds(gone, new Set());
  noteCatalogRemovals(gone, new Date().toISOString());
  window.dispatchEvent(new Event("hw-owned-changed"));
}

/** Drop false **הוסר מהמפה** labels when the server did not delete those houses. */
export function reconcileCatalogRemovedWithServer() {
  if (typeof window === "undefined") return;
  const serverRemoved = new Set(loadServerRemovedHouseIds());
  for (const entry of loadCatalogRemovedEntries()) {
    if (!serverRemoved.has(entry.id)) clearCatalogRemoved(entry.id);
  }
}
