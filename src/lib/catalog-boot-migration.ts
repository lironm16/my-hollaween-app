import { appVersion } from "@/lib/app-version";
import { clearCatalogCacheMeta, clearDeviceCatalogCache } from "@/lib/offline-db";

const CATALOG_BOOT_GENERATION_KEY = "hw-catalog-boot-generation";
/** Bump when a one-time device catalog wipe is required after a bad release. */
export const CATALOG_BOOT_GENERATION = 4;

export function catalogBootMigrationNeeded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = Number(localStorage.getItem(CATALOG_BOOT_GENERATION_KEY) || 0);
    return !Number.isFinite(stored) || stored < CATALOG_BOOT_GENERATION;
  } catch {
    return true;
  }
}

export function completeCatalogBootMigration() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CATALOG_BOOT_GENERATION_KEY, String(CATALOG_BOOT_GENERATION));
    localStorage.setItem("hw-app-catalog-version", appVersion());
  } catch {
    /* private mode */
  }
}

/** Drop stale caches / legacy `complete` meta after a bad release. */
export function runCatalogBootMigrationIfNeeded(): boolean {
  if (!catalogBootMigrationNeeded()) return false;
  const stored = Number(localStorage.getItem(CATALOG_BOOT_GENERATION_KEY) || 0);
  if (!Number.isFinite(stored) || stored < 3) {
    clearDeviceCatalogCache();
  } else {
    clearCatalogCacheMeta();
  }
  completeCatalogBootMigration();
  return true;
}
