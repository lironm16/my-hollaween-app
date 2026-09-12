import type { NeighborhoodId } from "@/lib/config";
import { tombstoneHouse, loadDeletedHouseIds } from "@/lib/deleted-houses";
import { syncDecorFields } from "@/lib/house-state";
import { houseHoursWindows, syncHoursFields } from "@/lib/hours";
import type { CandyTone, HouseInput, ScareLevel, SensitivityId } from "@/lib/types";
import type { Catalog, PublicHouse } from "@/lib/types";

const DB_NAME = "halloween-neighborhood";
const STORE = "catalog";
const PENDING_STORE = "pending";
const KEY = "latest";
const CATALOG_LS_KEY = "hw-catalog-cache";
const PENDING_LS_KEY = "hw-pending-writes";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function stamp(value: string) {
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : 0;
}

function overlayLocalHouses(catalog: Catalog): Catalog {
  const deleted = new Set(loadDeletedHouseIds());
  const byId = new Map(
    catalog.houses.filter((house) => !deleted.has(house.id)).map((house) => [house.id, house]),
  );
  const take = (house: PublicHouse) => {
    if (deleted.has(house.id)) return;
    const current = byId.get(house.id);
    if (!current || stamp(house.updatedAt) >= stamp(current.updatedAt)) {
      byId.set(house.id, current ? { ...current, ...house } : house);
    }
  };
  for (const owned of loadOwnedHouses()) {
    if (owned.preview) take(owned.preview);
  }
  for (const pending of loadPendingWritesSync()) {
    take(pending.house);
  }
  return { ...catalog, houses: [...byId.values()] };
}

export function withDeviceHouseOverlays(catalog: Catalog): Catalog {
  return overlayLocalHouses(catalog);
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
  return overlayLocalHouses({ ...catalog, houses });
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

export function rememberPublishedHouse(house: PublicHouse) {
  const cached = loadCatalogCacheSync();
  const next: Catalog = {
    updatedAt: house.updatedAt || new Date().toISOString(),
    neighborhood: cached?.neighborhood ?? "",
    houses: [...(cached?.houses ?? []).filter((item) => item.id !== house.id), house],
  };
  void saveCatalogCache(next);
}

export function forgetPublishedHouse(id: string) {
  if (typeof window === "undefined" || !id) return;
  tombstoneHouse(id);
  const cached = loadCatalogCacheSync();
  if (cached?.houses.some((item) => item.id === id)) {
    void saveCatalogCache({
      ...cached,
      houses: cached.houses.filter((item) => item.id !== id),
    });
  }
  removePendingWrite(id);
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

const SKIPPED_KEY = "hw-skipped-houses";

export function loadSkippedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SKIPPED_KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function isSkipped(id: string) {
  return loadSkippedIds().includes(id);
}

export function skipHouse(id: string): string[] {
  const current = loadSkippedIds();
  if (current.includes(id)) return current;
  const next = [id, ...current];
  localStorage.setItem(SKIPPED_KEY, JSON.stringify(next.slice(0, 200)));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("hw-skipped-changed"));
  }
  return next;
}

export function unskipHouse(id: string): string[] {
  const current = loadSkippedIds();
  const next = current.filter((item) => item !== id);
  localStorage.setItem(SKIPPED_KEY, JSON.stringify(next));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("hw-skipped-changed"));
  }
  return next;
}

export function toggleSkipped(id: string): string[] {
  return isSkipped(id) ? unskipHouse(id) : skipHouse(id);
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

export function backupLooksNewer(backup: ServerDbBackup, serverUpdatedAt: string, serverHouses: Array<{ status: string }>) {
  if (stamp(backup.updatedAt) > stamp(serverUpdatedAt)) return true;
  const backupApproved = backup.houses.filter((h) => h.status === "approved").length;
  const serverApproved = serverHouses.filter((h) => h.status === "approved").length;
  return backupApproved > serverApproved;
}

const FILTERS_KEY = "hw-house-filters";
const FILTERS_VERSION_KEY = "hw-house-filters-version";

export type HouseFiltersState = {
  accessibleOnly: boolean;
  openNowOnly: boolean;
  closingSoonOnly: boolean;
  openingSoonOnly: boolean;
  notYetOpenOnly: boolean;
  onBreakOnly: boolean;
  afterHoursOnly: boolean;
  /** When "now", from/to are resolved from the wall clock at filter time. */
  visitWindowMode?: "all" | "now" | "custom";
  /** Custom mode: apply a start bound (defaults on when entering custom). */
  visitWindowUseFrom?: boolean;
  /** Custom mode: apply an end bound (defaults off until the user enables it). */
  visitWindowUseTo?: boolean;
  /** Optional visitor outing window on event night (HH:MM, empty = unset). */
  visitWindowFrom: string;
  visitWindowTo: string;
  closedOnly: boolean;
  decorOnlyOnly: boolean;
  sensitivityFilters: SensitivityId[];
  scareFilters: ScareLevel[];
  candyFilters: CandyTone[];
  neighborhoodFilters: NeighborhoodId[];
  likedOnly: boolean;
  unvisitedOnly: boolean;
  visitedOnly: boolean;
  /** Show only houses skipped on the route. */
  skippedOnly: boolean;
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

export function loadHouseFiltersVersion(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(FILTERS_VERSION_KEY);
    const version = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(version) ? version : 0;
  } catch {
    return 0;
  }
}

export function saveHouseFiltersVersion(version: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FILTERS_VERSION_KEY, String(version));
  } catch {
    /* private mode */
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

export type PendingHouseWrite = {
  id: string;
  method: "PATCH" | "POST";
  url: string;
  body: Record<string, unknown>;
  house: PublicHouse;
  editCode?: string;
  createdAt: string;
};

export function applyLocalHousePatch(
  house: PublicHouse,
  patch: Partial<HouseInput> & { photoUrl?: string; ownerFrozenUntil?: string | null },
): PublicHouse {
  const next: PublicHouse = {
    ...house,
    ...patch,
    treats: patch.treats ?? house.treats,
    treatStock: patch.treatStock ? { ...house.treatStock, ...patch.treatStock } : house.treatStock,
    updatedAt: new Date().toISOString(),
  };
  if (patch.openHours !== undefined || patch.openFrom !== undefined || patch.openTo !== undefined) {
    const hours = syncHoursFields(
      patch.openHours?.length
        ? patch.openHours
        : houseHoursWindows({ ...house, ...patch }),
    );
    next.openHours = hours.openHours;
    next.openFrom = hours.openFrom;
    next.openTo = hours.openTo;
    next.openFrom2 = hours.openFrom2;
    next.openTo2 = hours.openTo2;
  }
  const decor = syncDecorFields(next);
  next.decorLevel = decor.decorLevel;
  next.decorated = decor.decorated;
  if (patch.visit === "closed") next.soldOut = true;
  else if (patch.visit) next.soldOut = false;
  if (patch.ownerFrozenUntil !== undefined) next.ownerFrozenUntil = patch.ownerFrozenUntil;
  return next;
}

function loadPendingWritesSync(): PendingHouseWrite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PENDING_LS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PendingHouseWrite => {
      return Boolean(
        item &&
          typeof item === "object" &&
          typeof (item as PendingHouseWrite).id === "string" &&
          (item as PendingHouseWrite).house &&
          typeof (item as PendingHouseWrite).house === "object",
      );
    });
  } catch {
    return [];
  }
}

function writePendingSync(items: PendingHouseWrite[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PENDING_LS_KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
}

export function loadPendingWrites(): PendingHouseWrite[] {
  return loadPendingWritesSync();
}

export function queueHouseWrite(write: PendingHouseWrite) {
  const next = loadPendingWritesSync().filter((item) => item.id !== write.id);
  next.push(write);
  writePendingSync(next);
  rememberPublishedHouse(write.house);
  if (write.editCode && !write.url.includes("/api/admin/")) {
    saveOwnedHouse({
      id: write.house.id,
      name: write.house.name,
      editCode: write.editCode,
      preview: write.house,
    });
  }
}

export function removePendingWrite(id: string) {
  writePendingSync(loadPendingWritesSync().filter((item) => item.id !== id));
}

let flushing = false;

export async function flushPendingHouseWrites(): Promise<number> {
  if (flushing) return 0;
  const pending = loadPendingWritesSync();
  if (pending.length === 0) return 0;
  flushing = true;
  let flushed = 0;
  try {
    for (const item of pending) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.body),
        });
        if (!res.ok) continue;
        removePendingWrite(item.id);
        flushed += 1;
      } catch {
        /* stay queued */
      }
    }
    return flushed;
  } finally {
    flushing = false;
  }
}
