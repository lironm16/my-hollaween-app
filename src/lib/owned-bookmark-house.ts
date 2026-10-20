import { houseIsAtLeastAsNew } from "@/lib/house-updated-at";
import type { PublicHouse } from "@/lib/types";
import type { OwnedHouse } from "@/lib/offline-db";

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
    return houseIsAtLeastAsNew(preview, fromCatalog)
      ? { ...fromCatalog, ...preview }
      : fromCatalog;
  }
  if (preview) return preview;
  if (fromCatalog) return fromCatalog;
  const name = item.name?.trim() || houseName?.trim();
  if (!name) return null;
  return publicHouseFromOwnedBookmark({ id: item.id, name });
}
