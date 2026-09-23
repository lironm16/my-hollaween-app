import { syncCatalog } from "@/lib/catalog-sync";
import { loadCatalogCacheSync } from "@/lib/offline-db";
import type { Catalog, PublicHouse } from "@/lib/types";

/** Merge live catalog state with the on-device cache without dropping house ids. */
export function resolveCatalogHouses(catalog: Catalog | null): PublicHouse[] {
  const cached = loadCatalogCacheSync();
  if (!catalog?.houses.length) return cached?.houses ?? [];
  if (!cached?.houses.length) return catalog.houses;
  return syncCatalog(cached, catalog).houses;
}
