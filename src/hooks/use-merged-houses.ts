"use client";

import { useMemo } from "react";
import { toEditorHouse, toPublicHouse } from "@/lib/ids";
import { loadDeletedHouseIds } from "@/lib/deleted-houses";
import { loadPendingWrites } from "@/lib/offline-db";
import { isStubHouse } from "@/lib/house-set";
import type { EditorHouse, House, PublicHouse } from "@/lib/types";
import type { OwnedHouse } from "@/lib/offline-db";

function mergeIncomingHouse(
  current: PublicHouse | undefined,
  incoming: PublicHouse,
  admin: boolean,
): PublicHouse {
  let merged = incoming;
  if (
    admin &&
    current?.address?.trim() &&
    !incoming.address?.trim()
  ) {
    merged = {
      ...incoming,
      address: current.address,
      arrival: incoming.arrival?.trim() ? incoming.arrival : current.arrival,
    };
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
}: {
  catalogHouses: PublicHouse[];
  owned: OwnedHouse[];
  admin: boolean;
  adminHouses: House[];
  /** Edit page needs catalog + admin API houses; the map uses admin houses only. */
  includeCatalogWhenAdmin?: boolean;
}): PublicHouse[] {
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
      const incoming = toEditorHouse(house) as EditorHouse;
      const current = byId.get(house.id);
      byId.set(house.id, mergeIncomingHouse(current, incoming, admin));
    }
  }
  for (const item of owned) {
    if (!item.preview || deleted.has(item.id)) continue;
    const current = byId.get(item.id);
    if (!current || Date.parse(item.preview.updatedAt) >= Date.parse(current.updatedAt || "")) {
      byId.set(item.id, mergeIncomingHouse(current, item.preview, admin));
    }
  }
  for (const pending of loadPendingWrites()) {
    if (deleted.has(pending.id)) continue;
    const current = byId.get(pending.id);
    if (!current || Date.parse(pending.house.updatedAt) >= Date.parse(current.updatedAt || "")) {
      byId.set(pending.id, mergeIncomingHouse(current, pending.house, admin));
    }
  }
  return [...byId.values()].filter((house) => !deleted.has(house.id));
}

export function useMergedHouses({
  catalogHouses,
  owned,
  admin,
  adminHouses,
  includeCatalogWhenAdmin = false,
}: {
  catalogHouses: PublicHouse[];
  owned: OwnedHouse[];
  admin: boolean;
  adminHouses: House[];
  includeCatalogWhenAdmin?: boolean;
}) {
  return useMemo(
    () =>
      mergeVisibleHouses({
        catalogHouses,
        owned,
        admin,
        adminHouses,
        includeCatalogWhenAdmin,
      }),
    [catalogHouses, owned, admin, adminHouses, includeCatalogWhenAdmin],
  );
}
