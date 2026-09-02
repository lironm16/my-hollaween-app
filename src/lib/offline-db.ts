import type { Catalog, PublicHouse } from "@/lib/types";

const DB_NAME = "halloween-neighborhood";
const STORE = "catalog";
const KEY = "latest";

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

export async function saveCatalogCache(catalog: Catalog) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(catalog, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB can be blocked in private mode; ignore.
  }
}

export async function loadCatalogCache(): Promise<Catalog | null> {
  try {
    const db = await openDb();
    const value = await new Promise<Catalog | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result as Catalog | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return value ?? null;
  } catch {
    return null;
  }
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
  const next = loadOwnedHouses().filter((h) => h.id !== house.id);
  next.unshift(house);
  localStorage.setItem(MY_HOUSES_KEY, JSON.stringify(next.slice(0, 20)));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("hw-owned-changed"));
  }
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
