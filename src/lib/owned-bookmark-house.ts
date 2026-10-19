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
  };
}
