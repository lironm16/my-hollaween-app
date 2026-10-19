"use client";

import { useMemo } from "react";
import { toEditorHouse } from "@/lib/ids";
import { isCatalogRemoved } from "@/lib/catalog-removed";
import { loadDeletedHouseIds } from "@/lib/deleted-houses";
import { loadPendingWrites } from "@/lib/offline-db";
import { loadServerRemovedHouseIds } from "@/lib/server-removed-houses";
import { isPracticeHouse } from "@/lib/practice-house";
import { isStubHouse } from "@/lib/house-set";
import {
  adminHouseByIdMap,
  mergePublicHouseLocationFromAdminRow,
  mergePublicHouseWithAdminRow,
} from "@/lib/admin-house-overlay";
import { canViewHouseLocationDetails, type AddressRevealContext } from "@/lib/address-reveal";
import type { EditorHouse, House, PublicHouse } from "@/lib/types";
import type { OwnedHouse } from "@/lib/offline-db";

function ownedBookmarkHouse(item: OwnedHouse): PublicHouse | null {
  if (item.preview) return item.preview;
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

function mergeIncomingHouse(
  current: PublicHouse | undefined,
  incoming: PublicHouse,
  restoreRedactedLocations: boolean,
): PublicHouse {
  let merged = incoming;
  if (restoreRedactedLocations) {
    const street = incoming.address?.trim() || current?.address?.trim() || "";
    const arrival =
      incoming.arrival?.trim() || current?.arrival?.trim() || "";
    if (street !== (incoming.address ?? "") || arrival !== (incoming.arrival ?? "")) {
      merged = { ...incoming, address: street, arrival };
    }
  }
  if (current && isStubHouse(current) && !isStubHouse(merged)) {
    merged = {
      ...merged,
      isStub: true,
      description: merged.description?.trim() ? merged.description : current.description,
      photoUrl: merged.photoUrl?.trim() ? merged.photoUrl : current.photoUrl,
    };
  }
  if (isPracticeHouse(current) || isPracticeHouse(merged)) {
    merged = { ...merged, isPractice: true };
  }
  return merged;
}

export function mergeVisibleHouses({
  catalogHouses,
  owned,
  admin,
  adminHouses,
  includeCatalogWhenAdmin = false,
  restoreRedactedLocations,
  nightPassLinkedHouseId = null,
}: {
  catalogHouses: PublicHouse[];
  owned: OwnedHouse[];
  admin: boolean;
  adminHouses: House[];
  /** Edit page needs catalog + admin API houses; the map uses admin houses only. */
  includeCatalogWhenAdmin?: boolean;
  /** Admin merge can fill address back after catalog redaction — off in תצוגת משתמש. */
  restoreRedactedLocations?: boolean;
  /** Registered night pass on this house — keep visible even if a scope sync flagged «removed». */
  nightPassLinkedHouseId?: string | null;
}): PublicHouse[] {
  const restoreLocations = restoreRedactedLocations ?? admin;
  const deleted = new Set(loadDeletedHouseIds());
  // Device copies (saved / pending) must not re-add a house the server confirmed deleted — admins too.
  const serverRemoved = new Set(loadServerRemovedHouseIds());
  const byId = new Map<string, PublicHouse>();
  if (!admin || includeCatalogWhenAdmin) {
    for (const house of catalogHouses) {
      if (!deleted.has(house.id)) byId.set(house.id, house);
    }
  }
  if (admin) {
    for (const house of adminHouses) {
      if (deleted.has(house.id)) continue;
      const incoming = toEditorHouse(house, { includeAddedBy: true }) as EditorHouse;
      const current = byId.get(house.id);
      byId.set(house.id, mergeIncomingHouse(current, incoming, restoreLocations));
    }
  }
  for (const item of owned) {
    if (deleted.has(item.id) || serverRemoved.has(item.id)) continue;
    const bookmark = ownedBookmarkHouse(item);
    if (!bookmark) continue;
    if (!admin && isCatalogRemoved(item.id) && item.id !== nightPassLinkedHouseId) continue;
    const current = byId.get(item.id);
    if (!current || Date.parse(bookmark.updatedAt) >= Date.parse(current.updatedAt || "")) {
      byId.set(item.id, mergeIncomingHouse(current, bookmark, restoreLocations));
    }
  }
  for (const pending of loadPendingWrites()) {
    if (deleted.has(pending.id) || serverRemoved.has(pending.id)) continue;
    if (!admin && isCatalogRemoved(pending.id)) continue;
    const current = byId.get(pending.id);
    if (!current || Date.parse(pending.house.updatedAt) >= Date.parse(current.updatedAt || "")) {
      byId.set(pending.id, mergeIncomingHouse(current, pending.house, restoreLocations));
    }
  }
  return [...byId.values()].filter((house) => {
    if (deleted.has(house.id)) return false;
    if (!admin && isCatalogRemoved(house.id) && house.id !== nightPassLinkedHouseId) return false;
    return true;
  });
}

/** Fill redacted catalog rows from admin API snapshot (map/list/sheet). */
export function enrichHousesWithAdminLocations(
  houses: readonly PublicHouse[],
  adminHouses: readonly House[],
  enabled: boolean,
): PublicHouse[] {
  if (!enabled || adminHouses.length === 0) return [...houses];
  const byId = new Map(adminHouses.map((row) => [row.id, row]));
  return houses.map((house) => mergePublicHouseWithAdminRow(house, byId.get(house.id)));
}

/** תצוגת משתמש — public catalog stays redacted until reveal; fill rows the visitor would see at `ctx.now`. */
export function enrichHousesForUserPreview(
  houses: readonly PublicHouse[],
  adminHouses: readonly House[],
  ctx: AddressRevealContext,
): PublicHouse[] {
  if (adminHouses.length === 0) return [...houses];
  const byId = adminHouseByIdMap(adminHouses);
  return houses.map((house) => {
    if (!canViewHouseLocationDetails(house.id, ctx)) return house;
    return mergePublicHouseLocationFromAdminRow(house, byId.get(house.id));
  });
}

export function useMergedHouses({
  catalogHouses,
  owned,
  admin,
  adminHouses,
  includeCatalogWhenAdmin = false,
  restoreRedactedLocations,
  nightPassLinkedHouseId = null,
}: {
  catalogHouses: PublicHouse[];
  owned: OwnedHouse[];
  admin: boolean;
  adminHouses: House[];
  includeCatalogWhenAdmin?: boolean;
  restoreRedactedLocations?: boolean;
  nightPassLinkedHouseId?: string | null;
}) {
  return useMemo(
    () =>
      mergeVisibleHouses({
        catalogHouses,
        owned,
        admin,
        adminHouses,
        includeCatalogWhenAdmin,
        restoreRedactedLocations,
        nightPassLinkedHouseId,
      }),
    [
      catalogHouses,
      owned,
      admin,
      adminHouses,
      includeCatalogWhenAdmin,
      restoreRedactedLocations,
      nightPassLinkedHouseId,
    ],
  );
}
