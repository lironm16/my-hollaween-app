import { isRehearsalOn } from "@/lib/app-clock";
import { syncCatalog } from "@/lib/catalog-sync";
import { catalogHasRealHouses } from "@/lib/house-set";
import { loadCatalogCacheMeta, loadCatalogCacheSync } from "@/lib/offline-db";
import type { Catalog, CatalogCacheMeta, PublicHouse } from "@/lib/types";

/** Authoritative count from a server payload; falls back to inline houses on legacy full loads. */
export function resolveServerHouseCount(
  payload: Pick<Catalog, "houseCount" | "houses"> | null | undefined,
): number | undefined {
  if (!payload) return undefined;
  if (typeof payload.houseCount === "number" && payload.houseCount >= 0) {
    return payload.houseCount;
  }
  if (payload.houses?.length) return payload.houses.length;
  return undefined;
}

export function localCatalogHouseCount(catalog: Catalog | null): number {
  return catalog?.houses.length ?? 0;
}

/** True when the server says the public catalog size differs from what we are showing. */
export function catalogServerCountMismatch(
  catalog: Catalog | null,
  serverCount: number | undefined | null,
): boolean {
  if (serverCount == null || serverCount < 0) return false;
  return localCatalogHouseCount(catalog) !== serverCount;
}

/** Server sent a full inline list matching explicit `houseCount` — safe to drop stale local-only ids. */
export function isAuthoritativeHouseList(
  catalog: Pick<Catalog, "houseCount" | "houses"> | null | undefined,
): boolean {
  if (!catalog?.houses.length) return false;
  const count = catalog.houseCount;
  return typeof count === "number" && count >= 0 && catalog.houses.length === count;
}

/** True when the on-device list is shorter than the server says the catalog should be. */
export function catalogCacheIncomplete(
  catalog: Catalog | null,
  cacheMeta?: CatalogCacheMeta | null,
  serverCount?: number | null,
): boolean {
  const localCount = localCatalogHouseCount(catalog);
  const meta = cacheMeta ?? loadCatalogCacheMeta();
  const authoritative = serverCount ?? resolveServerHouseCount(catalog) ?? meta?.houseCount;

  if (typeof authoritative === "number" && localCount !== authoritative) return true;
  if (!meta?.complete) return true;
  if (typeof meta.houseCount === "number" && localCount > meta.houseCount) return true;
  if (typeof meta.houseCount === "number" && localCount < meta.houseCount) return true;
  return false;
}

/** Stale partial device caches must not skip the full snapshot load. */
export function catalogNeedsFullRefresh(
  catalog: Catalog | null,
  cacheMeta?: CatalogCacheMeta | null,
  serverCount?: number | null,
): boolean {
  if (!catalog?.houses?.length) return true;
  if (!catalogHasRealHouses(catalog)) {
    /** Stale stub-only snapshot (browser cache / old catalog.json) — must hit live API. */
    if (isRehearsalOn()) return false;
    return true;
  }
  return catalogCacheIncomplete(catalog, cacheMeta, serverCount);
}

/** Merge live catalog state with the on-device cache without dropping house ids. */
export function resolveCatalogHouses(catalog: Catalog | null): PublicHouse[] {
  const cached = loadCatalogCacheSync();
  if (!catalog?.houses.length) return cached?.houses ?? [];
  if (isAuthoritativeHouseList(catalog)) return catalog.houses;
  if (!cached?.houses.length) return catalog.houses;
  return syncCatalog(cached, catalog).houses;
}
