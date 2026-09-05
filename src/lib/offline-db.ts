import type { NeighborhoodId } from "@/lib/config";
import type { ScareLevel, SensitivityId } from "@/lib/types";
import type { Catalog, PublicHouse } from "@/lib/types";

const DB_NAME = "halloween-neighborhood";
const STORE = "catalog";
const KEY = "latest";
const CATALOG_LS_KEY = "hw-catalog-cache";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function asCachedCatalog(value: unknown): Catalog | null {
  if (!value || typeof value !== "object") return null;
  const catalog = value as Catalog;
  if (typeof catalog.updatedAt !== "string" || typeof catalog.neighborhood !== "string") return null;
  if (!Array.isArray(catalog.houses)) return null;
  const houses = catalog.houses.filter(
    (house): house is PublicHouse =>
      Boolean(
        house &&
          typeof house === "object" &&
          typeof house.id === "string" &&
          typeof house.name === "string" &&
          typeof (house as PublicHouse).lat === "number" &&
          typeof (house as PublicHouse).lng === "number",
      ),
  );
  if (!houses.length) return null;
  return { ...catalog, houses };
}

function readLocalCatalog(): Catalog | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CATALOG_LS_KEY);
    if (!raw) return null;
    return asCachedCatalog(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function writeLocalCatalog(catalog: Catalog) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CATALOG_LS_KEY, JSON.stringify(catalog));
  } catch {
    /* private mode / quota */
  }
}

export function loadCatalogCacheSync(): Catalog | null {
  return readLocalCatalog();
}

export async function saveCatalogCache(catalog: Catalog) {
  const safe = asCachedCatalog(catalog);
  if (!safe) return;
  writeLocalCatalog(safe);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(safe, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB can be blocked in private mode; localStorage is enough.
  }
}

export async function loadCatalogCache(): Promise<Catalog | null> {
  try {
    const db = await openDb();
    const value = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    const fromDb = asCachedCatalog(value);
    if (fromDb) {
      writeLocalCatalog(fromDb);
      return fromDb;
    }
  } catch {
    /* fall through to localStorage */
  }
  return readLocalCatalog();
}

const MY_HOUSES_KEY = "hw-my-houses";

export type OwnedHouse = {
  id: string;
  name: string;
  editCode: string;
  preview?: PublicHouse;
};

export function loadOwnedHouses(): OwnedHouse[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MY_HOUSES_KEY);
    return raw ? (JSON.parse(raw) as OwnedHouse[]) : [];
  } catch {
    return [];
  }
}

export function saveOwnedHouse(house: OwnedHouse) {
  try {
    const next = loadOwnedHouses().filter((h) => h.id !== house.id);
    next.unshift(house);
    localStorage.setItem(MY_HOUSES_KEY, JSON.stringify(next.slice(0, 20)));
    window.dispatchEvent(new Event("hw-owned-changed"));
  } catch {
    // Private mode / blocked storage should not look like a dead server.
  }
}

export function removeOwnedHouse(id: string) {
  try {
    const next = loadOwnedHouses().filter((h) => h.id !== id);
    localStorage.setItem(MY_HOUSES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("hw-owned-changed"));
  } catch {
    /* private mode */
  }
}

export function notifyCatalogChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("hw-catalog-changed"));
}

const LIKED_KEY = "hw-liked-houses";

export function loadLikedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIKED_KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function isLiked(id: string) {
  return loadLikedIds().includes(id);
}

export function toggleLiked(id: string): string[] {
  const current = loadLikedIds();
  const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
  localStorage.setItem(LIKED_KEY, JSON.stringify(next.slice(0, 80)));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("hw-liked-changed"));
  }
  return next;
}

const VISITED_KEY = "hw-visited-houses";

export function loadVisitedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VISITED_KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function isVisited(id: string) {
  return loadVisitedIds().includes(id);
}

export function toggleVisited(id: string): string[] {
  const current = loadVisitedIds();
  const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
  localStorage.setItem(VISITED_KEY, JSON.stringify(next.slice(0, 200)));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("hw-visited-changed"));
  }
  return next;
}

const SERVER_DB_KEY = "hw-server-db-backup";

export type ServerDbBackup = {
  updatedAt: string;
  houses: Array<Record<string, unknown> & { id: string; status: string; updatedAt: string }>;
};

export function loadServerDbBackup(): ServerDbBackup | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SERVER_DB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ServerDbBackup;
    if (!parsed?.updatedAt || !Array.isArray(parsed.houses)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveServerDbBackup(db: ServerDbBackup) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SERVER_DB_KEY, JSON.stringify(db));
  } catch {
    /* private mode */
  }
}

function stamp(value: string) {
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : 0;
}

export function backupLooksNewer(backup: ServerDbBackup, serverUpdatedAt: string, serverHouses: Array<{ status: string }>) {
  if (stamp(backup.updatedAt) > stamp(serverUpdatedAt)) return true;
  const backupApproved = backup.houses.filter((h) => h.status === "approved").length;
  const serverApproved = serverHouses.filter((h) => h.status === "approved").length;
  return backupApproved > serverApproved;
}

const FILTERS_KEY = "hw-house-filters";

export type HouseFiltersState = {
  accessibleOnly: boolean;
  candyOnly: boolean;
  openNowOnly: boolean;
  sensitivityFilters: SensitivityId[];
  scareFilters: ScareLevel[];
  neighborhoodFilters: NeighborhoodId[];
  likedOnly: boolean;
  unvisitedOnly: boolean;
  /** Include houses with no outdoor decoration (gray struck lights). */
  includeUndecorated: boolean;
};

export function loadHouseFilters(): HouseFiltersState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HouseFiltersState>;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as HouseFiltersState;
  } catch {
    return null;
  }
}

export function saveHouseFilters(filters: HouseFiltersState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  } catch {
    /* private mode */
  }
}
