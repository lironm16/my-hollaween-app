import {
  houseNeedsLocationHydration,
  houseServerDetailReady,
  withServerHouseDetail,
} from "@/lib/device-catalog-cache";
import { fetchPublicHouse, type FetchPublicHouseResult } from "@/lib/fetch-public-house";
import type { PublicHouse } from "@/lib/types";

const hydratedById = new Map<string, PublicHouse>();
const inflightById = new Map<string, Promise<FetchPublicHouseResult>>();

export function readSessionHouseDetail(id: string): PublicHouse | null {
  const hit = hydratedById.get(id);
  return hit && houseServerDetailReady(hit) ? hit : null;
}

export function rememberSessionHouseDetail(house: PublicHouse) {
  if (!houseServerDetailReady(house)) return;
  hydratedById.set(house.id, withServerHouseDetail(house));
}

export function fetchPublicHouseSession(id: string): Promise<FetchPublicHouseResult> {
  const cached = readSessionHouseDetail(id);
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
  const cached = readSessionHouseDetail(house.id);
  if (cached) return false;
  return houseNeedsLocationHydration(house);
}
