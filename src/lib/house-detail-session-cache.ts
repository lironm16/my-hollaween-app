import {
  houseNeedsLocationHydration,
  houseServerDetailReady,
  withServerHouseDetail,
} from "@/lib/device-catalog-cache";
import { fetchPublicHouse, type FetchPublicHouseResult } from "@/lib/fetch-public-house";
import { houseUpdatedMs } from "@/lib/house-updated-at";
import type { PublicHouse } from "@/lib/types";

const hydratedById = new Map<string, PublicHouse>();
const inflightById = new Map<string, Promise<FetchPublicHouseResult>>();

function sessionDetailFresh(cached: PublicHouse, minUpdatedAt?: string): boolean {
  if (!minUpdatedAt) return true;
  return houseUpdatedMs(cached.updatedAt) >= houseUpdatedMs(minUpdatedAt);
}

export function readSessionHouseDetail(
  id: string,
  minUpdatedAt?: string,
): PublicHouse | null {
  const hit = hydratedById.get(id);
  if (!hit || !houseServerDetailReady(hit)) return null;
  if (!sessionDetailFresh(hit, minUpdatedAt)) return null;
  return hit;
}

/** Night-pass scope changed — details fetched under the old audience must not be reused. */
export function clearSessionHouseDetails() {
  hydratedById.clear();
  inflightById.clear();
}

export function rememberSessionHouseDetail(house: PublicHouse) {
  if (!houseServerDetailReady(house)) return;
  const next = withServerHouseDetail(house);
  const prev = hydratedById.get(house.id);
  if (prev && houseUpdatedMs(next.updatedAt) < houseUpdatedMs(prev.updatedAt)) return;
  hydratedById.set(house.id, next);
}

export function fetchPublicHouseSession(
  id: string,
  minUpdatedAt?: string,
): Promise<FetchPublicHouseResult> {
  const cached = readSessionHouseDetail(id, minUpdatedAt);
  if (cached) return Promise.resolve({ ok: true, house: cached });

  const existing = inflightById.get(id);
  if (existing) return existing;

  const request = fetchPublicHouse(id).then((result) => {
    if (result.ok) rememberSessionHouseDetail(result.house);
    return result;
  });
  inflightById.set(id, request);
  void request.finally(() => {
    if (inflightById.get(id) === request) inflightById.delete(id);
  });
  return request;
}

export function houseNeedsSessionHydration(house: PublicHouse | null | undefined): boolean {
  if (!house) return false;
  if (readSessionHouseDetail(house.id, house.updatedAt)) return false;
  if (houseNeedsLocationHydration(house)) return true;
  return hydratedById.has(house.id);
}
