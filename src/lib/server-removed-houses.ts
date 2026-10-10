/**
 * House ids the live server explicitly reported as deleted (`removed` on `/api/catalog`).
 * Merges keep local rows missing from shorter lists, so a deletion must be remembered here or the
 * device cache brings the house back. Only explicit server ids land here — never absence from a list.
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

/**
 * Apply one live server response: rows it returns are listed right now (restored houses come back),
 * explicit `removed` ids stay hidden on this device until the server lists them again.
 */
export function recordLiveCatalogRemovals(live: {
  houses?: Array<{ id: string }>;
  removed?: string[];
}) {
  if (typeof window === "undefined") return;
  const listed = new Set((live.houses ?? []).map((house) => house.id));
  const removed = (live.removed ?? []).filter(Boolean);
  const current = loadServerRemovedHouseIds();
  const kept = current.filter((id) => !listed.has(id) && !removed.includes(id));
  const next = [...removed, ...kept];
  if (next.length === current.length && next.every((id, i) => id === current[i])) return;
  writeIds(next);
}
