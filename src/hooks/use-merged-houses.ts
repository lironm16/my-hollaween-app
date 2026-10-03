"use client";

import { useMemo } from "react";
import { toEditorHouse } from "@/lib/ids";
import { loadDeletedHouseIds } from "@/lib/deleted-houses";
import { loadPendingWrites } from "@/lib/offline-db";
import { isStubHouse } from "@/lib/house-set";
import type { EditorHouse, House, PublicHouse } from "@/lib/types";
import type { OwnedHouse } from "@/lib/offline-db";

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
      description: merged.description?.includes("סטאב לחזרה")
        ? merged.description
        : current.description || merged.description,
      photoUrl: current.photoUrl?.includes("/images/stubs/")
        ? current.photoUrl
        : merged.photoUrl,
    };
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
}: {
  catalogHouses: PublicHouse[];
  owned: OwnedHouse[];
  admin: boolean;
  adminHouses: House[];
  /** Edit page needs catalog + admin API houses; the map uses admin houses only. */
  includeCatalogWhenAdmin?: boolean;
  /** Admin merge can fill address back after catalog redaction — off in תצוגת משתמש. */
  restoreRedactedLocations?: boolean;
}): PublicHouse[] {
  const restoreLocations = restoreRedactedLocations ?? admin;
  const deleted = new Set(loadDeletedHouseIds());
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
    if (!item.preview || deleted.has(item.id)) continue;
    const current = byId.get(item.id);
    if (!current || Date.parse(item.preview.updatedAt) >= Date.parse(current.updatedAt || "")) {
      byId.set(item.id, mergeIncomingHouse(current, item.preview, restoreLocations));
    }
  }
  for (const pending of loadPendingWrites()) {
    if (deleted.has(pending.id)) continue;
    const current = byId.get(pending.id);
    if (!current || Date.parse(pending.house.updatedAt) >= Date.parse(current.updatedAt || "")) {
      byId.set(pending.id, mergeIncomingHouse(current, pending.house, restoreLocations));
    }
  }
  return [...byId.values()].filter((house) => !deleted.has(house.id));
}

/** Fill redacted catalog rows from admin API snapshot (map/list/sheet). */
export function enrichHousesWithAdminLocations(
  houses: readonly PublicHouse[],
  adminHouses: readonly House[],
  enabled: boolean,
): PublicHouse[] {
  if (!enabled || adminHouses.length === 0) return [...houses];
  const byId = new Map(adminHouses.map((row) => [row.id, row]));
  return houses.map((house) => {
    const admin = byId.get(house.id);
    if (!admin) return house;
    const address = house.address?.trim() ? house.address : admin.address;
    const arrival = house.arrival?.trim() ? house.arrival : admin.arrival;
    const neighborhood =
      house.neighborhood !== undefined ? house.neighborhood : admin.neighborhood;
    if (
      address === house.address &&
      arrival === house.arrival &&
      neighborhood === house.neighborhood
    ) {
      return house;
    }
    return { ...house, address, arrival, neighborhood };
  });
}

export function useMergedHouses({
  catalogHouses,
  owned,
  admin,
  adminHouses,
  includeCatalogWhenAdmin = false,
  restoreRedactedLocations,
}: {
  catalogHouses: PublicHouse[];
  owned: OwnedHouse[];
  admin: boolean;
  adminHouses: House[];
  includeCatalogWhenAdmin?: boolean;
  restoreRedactedLocations?: boolean;
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
      }),
    [catalogHouses, owned, admin, adminHouses, includeCatalogWhenAdmin, restoreRedactedLocations],
  );
}
