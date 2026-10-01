import { withServerHouseDetail } from "@/lib/device-catalog-cache";
import type { PublicHouse } from "@/lib/types";

export type FetchPublicHouseResult =
  | { ok: true; house: PublicHouse }
  | { ok: false; status: number };

/** Live house row — used when device cache is pin-only or for revocation checks. */
export async function fetchPublicHouse(id: string): Promise<FetchPublicHouseResult> {
  const res = await fetch(`/api/houses/${encodeURIComponent(id)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(18_000),
  });
  if (!res.ok) return { ok: false, status: res.status };
  const house = (await res.json()) as PublicHouse;
  return { ok: true, house: withServerHouseDetail(house) };
}

export const HOUSE_DETAIL_LOADED_EVENT = "hw-house-detail-loaded";

export function notifyHouseDetailLoaded(house: PublicHouse) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(HOUSE_DETAIL_LOADED_EVENT, { detail: house }));
}
