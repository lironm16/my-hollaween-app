"use client";

import { useMemo } from "react";
import { toPublicHouse } from "@/lib/ids";
import { loadDeletedHouseIds } from "@/lib/deleted-houses";
import { loadPendingWrites } from "@/lib/offline-db";
import type { House, PublicHouse } from "@/lib/types";
import type { OwnedHouse } from "@/lib/offline-db";

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
      if (house.status === "rejected" || deleted.has(house.id)) continue;
      byId.set(house.id, toPublicHouse(house) as PublicHouse);
    }
  }
  for (const item of owned) {
    if (!item.preview || deleted.has(item.id)) continue;
    const current = byId.get(item.id);
    if (!current || Date.parse(item.preview.updatedAt) >= Date.parse(current.updatedAt || "")) {
      byId.set(item.id, item.preview);
    }
  }
  for (const pending of loadPendingWrites()) {
    if (deleted.has(pending.id)) continue;
    const current = byId.get(pending.id);
    if (!current || Date.parse(pending.house.updatedAt) >= Date.parse(current.updatedAt || "")) {
      byId.set(pending.id, pending.house);
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
