import type { Catalog } from "@/lib/types";

const CATALOG_REMOVED_KEY = "hw-catalog-removed";
const MAX_ENTRIES = 120;

export type CatalogRemovedEntry = { id: string; removedAt: string };

function readEntries(): CatalogRemovedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CATALOG_REMOVED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is CatalogRemovedEntry =>
        Boolean(row) &&
        typeof row === "object" &&
        typeof (row as CatalogRemovedEntry).id === "string" &&
        typeof (row as CatalogRemovedEntry).removedAt === "string",
    );
  } catch {
    return [];
  }
}

function writeEntries(entries: CatalogRemovedEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CATALOG_REMOVED_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    window.dispatchEvent(new Event("hw-catalog-removed-changed"));
  } catch {
    /* private mode */
  }
}

export function loadCatalogRemovedEntries(): CatalogRemovedEntry[] {
  return readEntries();
}

export function isCatalogRemoved(id: string | undefined | null) {
  if (!id) return false;
  return readEntries().some((entry) => entry.id === id);
}

/** Owners may view/navigate locally; admins keep full edit in admin flows. */
export function deviceHouseEditAllowed(
  id: string | undefined | null,
  options?: { admin?: boolean },
) {
  if (options?.admin) return true;
  if (!id) return false;
  return !isCatalogRemoved(id);
}

export function clearCatalogRemoved(id: string) {
  if (!id) return;
  const next = readEntries().filter((entry) => entry.id !== id);
  if (next.length === readEntries().length) return;
  writeEntries(next);
}

export function noteCatalogRemovals(ids: string[], removedAt: string) {
  if (typeof window === "undefined" || ids.length === 0) return;
  const stamp = removedAt.trim() || new Date().toISOString();
  const byId = new Map(readEntries().map((entry) => [entry.id, entry]));
  for (const id of ids) {
    if (!id) continue;
    byId.set(id, { id, removedAt: stamp });
  }
  const merged = [...byId.values()].sort(
    (a, b) => Date.parse(b.removedAt) - Date.parse(a.removedAt),
  );
  writeEntries(merged);
}

/** Persist catalog deletes (owner or admin) from sync so local previews can show status. */
export function trackCatalogRemovalDelta(
  prev: Catalog | null,
  next: Catalog,
  explicitRemoved: string[] | undefined,
) {
  if (typeof window === "undefined") return;
  const nextIds = new Set(next.houses.map((house) => house.id));
  const removed = new Set(explicitRemoved ?? []);
  if (prev) {
    for (const house of prev.houses) {
      if (!nextIds.has(house.id)) removed.add(house.id);
    }
  }
  if (removed.size > 0) noteCatalogRemovals([...removed], next.updatedAt);
  for (const house of next.houses) clearCatalogRemoved(house.id);
}
