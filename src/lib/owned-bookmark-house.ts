import { fetchPublicHouse } from "@/lib/fetch-public-house";
import { rememberSessionHouseDetail } from "@/lib/house-detail-session-cache";
import { mergeOwnedLocationFields } from "@/lib/owned-location-merge";
import type { PublicHouse } from "@/lib/types";
import {
  loadOwnedHouses,
  notifyCatalogChanged,
  saveOwnedHouse,
  type OwnedHouse,
} from "@/lib/offline-db";

function hasStreetAddress(house: Pick<PublicHouse, "address"> | null | undefined): boolean {
  return Boolean(house?.address?.trim());
}

export { mergeOwnedLocationFields } from "@/lib/owned-location-merge";

/** Minimal catalog row from a device bookmark when preview was not cached. */
export function publicHouseFromOwnedBookmark(item: Pick<OwnedHouse, "id" | "name">): PublicHouse | null {
  const name = item.name?.trim();
  if (!name) return null;
  return {
    id: item.id,
    name,
    theme: "pumpkin",
    address: "",
    arrival: "",
    description: "",
    lat: 0,
    lng: 0,
    treats: [],
    treatStock: {},
    visit: "come",
    scareLevel: "mild",
    openFrom: "",
    openTo: "",
    notes: "",
    accessible: true,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    createdAt: "",
    updatedAt: "",
    deviceCacheStub: true,
  } as PublicHouse;
}

/** Prefer the newer of device preview vs live catalog — stale previews must not mask map updates. */
export function houseFromOwnedBookmark(
  item: OwnedHouse,
  fromCatalog: PublicHouse | undefined,
  houseName?: string,
): PublicHouse | null {
  const preview = item.preview;
  if (fromCatalog && preview) {
    return mergeOwnedLocationFields(preview, fromCatalog);
  }
  if (preview) return preview;
  if (fromCatalog) return fromCatalog;
  const name = item.name?.trim() || houseName?.trim();
  if (!name) return null;
  return publicHouseFromOwnedBookmark({ id: item.id, name });
}

/** Heal previews wiped by redacted catalog sync — owner cookie returns full row from GET /api/houses/[id]. */
export async function repairOwnedPreviewsMissingAddress() {
  if (typeof window === "undefined") return;
  let changed = false;
  for (const item of loadOwnedHouses()) {
    if (hasStreetAddress(item.preview)) continue;
    const result = await fetchPublicHouse(item.id);
    if (!result.ok || !hasStreetAddress(result.house)) continue;
    saveOwnedHouse({ ...item, preview: result.house });
    rememberSessionHouseDetail(result.house);
    changed = true;
  }
  if (changed) notifyCatalogChanged();
}
