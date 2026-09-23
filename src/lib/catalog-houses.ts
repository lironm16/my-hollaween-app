import { syncCatalog } from "@/lib/catalog-sync";
import { catalogHasRealHouses, isStubHouse } from "@/lib/house-set";
import { loadCatalogCacheSync } from "@/lib/offline-db";
import type { Catalog, PublicHouse } from "@/lib/types";

/** Below this real-house count, always fetch `/catalog.json` instead of delta-only polls. */
export const MIN_EXPECTED_REAL_HOUSES = 10;

export function countRealHouses(catalog: Catalog | null): number {
  if (!catalog?.houses.length) return 0;
  return catalog.houses.filter((house) => !isStubHouse(house)).length;
}

/** Stale partial device caches (e.g. 4 houses) must not skip the full snapshot load. */
export function catalogNeedsFullRefresh(catalog: Catalog | null): boolean {
  if (!catalog?.houses.length) return true;
  if (!catalogHasRealHouses(catalog)) return false;
  return countRealHouses(catalog) < MIN_EXPECTED_REAL_HOUSES;
}

/** Merge live catalog state with the on-device cache without dropping house ids. */
export function resolveCatalogHouses(catalog: Catalog | null): PublicHouse[] {
  const cached = loadCatalogCacheSync();
  if (!catalog?.houses.length) return cached?.houses ?? [];
  if (!cached?.houses.length) return catalog.houses;
  return syncCatalog(cached, catalog).houses;
}
