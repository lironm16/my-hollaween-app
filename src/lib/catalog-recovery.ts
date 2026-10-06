import { localCatalogHouseCount } from "@/lib/catalog-houses";
import type { Catalog } from "@/lib/types";

export function catalogShortfall(
  catalog: Catalog | null,
  serverCount: number | undefined | null,
): number {
  if (serverCount == null || serverCount < 0) return 0;
  return Math.max(0, serverCount - localCatalogHouseCount(catalog));
}

/** Full `GET /api/catalog` when cheap snapshot + delta still disagree with server count. */
export function shouldFetchFullCatalogAfterCheapRecovery(
  serverCount: number,
  localCount: number,
): boolean {
  if (localCount !== serverCount) return true;
  return false;
}

/** Steady-state delta polls are unsafe while the list is empty or shorter than the server count. */
export function shouldUseSteadyDeltaPoll(input: {
  localCount: number;
  since?: string;
  needsFullRefresh: boolean;
  serverCount?: number | null;
  cacheMarkedComplete?: boolean;
}): boolean {
  if (!input.since || input.needsFullRefresh) return false;
  if (input.localCount === 0) return false;
  if (input.serverCount == null || input.serverCount < 0) {
    return Boolean(input.cacheMarkedComplete);
  }
  return input.localCount === input.serverCount;
}
