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
}: {
  catalogHouses: PublicHouse[];
  owned: OwnedHouse[];
  admin: boolean;
  adminHouses: House[];
}): PublicHouse[] {
  const deleted = new Set(loadDeletedHouseIds());
  const listed = admin
    ? adminHouses
        .filter((house) => house.status !== "rejected")
        .map((house) => toPublicHouse(house) as PublicHouse)
    : catalogHouses;
  const byId = new Map(listed.map((house) => [house.id, house]));
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
}: {
  catalogHouses: PublicHouse[];
  owned: OwnedHouse[];
  admin: boolean;
  adminHouses: House[];
}) {
  return useMemo(
    () => mergeVisibleHouses({ catalogHouses, owned, admin, adminHouses }),
    [catalogHouses, owned, admin, adminHouses],
  );
}
