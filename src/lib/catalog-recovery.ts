import { localCatalogHouseCount } from "@/lib/catalog-houses";
import type { Catalog } from "@/lib/types";

/** Missing this many houses (absolute) triggers full catalog after cheap recovery. */
export const CATALOG_FULL_RECOVERY_MIN_GAP = 8;

/** Missing at least this fraction of the server catalog triggers full recovery. */
export const CATALOG_FULL_RECOVERY_MIN_RATIO = 0.12;

export function catalogShortfall(
  catalog: Catalog | null,
  serverCount: number | undefined | null,
): number {
  if (serverCount == null || serverCount < 0) return 0;
  return Math.max(0, serverCount - localCatalogHouseCount(catalog));
}

/** Full `GET /api/catalog` only after snapshot + wide delta still leave a large gap. */
export function shouldFetchFullCatalogAfterCheapRecovery(
  serverCount: number,
  localCount: number,
): boolean {
  const gap = Math.max(0, serverCount - localCount);
  if (gap === 0) return false;
  if (gap >= CATALOG_FULL_RECOVERY_MIN_GAP) return true;
  if (serverCount <= 0) return false;
  return gap / serverCount >= CATALOG_FULL_RECOVERY_MIN_RATIO;
}
