import { isStubHouse } from "@/lib/house-set";
import type { Catalog, PublicHouse } from "@/lib/types";

/** Every cached row carries an explicit boolean — missing `isStub` used to look like a real house. */
export function withExplicitStubFlag(house: PublicHouse): PublicHouse {
  if (typeof house.isStub === "boolean") return house;
  if (house.deviceCacheStub === true) return { ...house, isStub: true };
  return { ...house, isStub: false };
}

/** Prefer newer fields; never drop stub classification or stub media after device-cache strip. */
export function mergePublicHouseStubFields(
  newer: PublicHouse,
  older: PublicHouse,
): PublicHouse {
  const stub = isStubHouse(newer) || isStubHouse(older);
  if (!stub) {
    const { deviceCacheStub, ...rest } = newer;
    void deviceCacheStub;
    return withExplicitStubFlag({ ...rest, isStub: false });
  }
  const merged: PublicHouse = {
    ...newer,
    isStub: true,
    deviceCacheStub: Boolean(newer.deviceCacheStub || older.deviceCacheStub),
  };
  if (!merged.description?.trim() && older.description?.trim()) {
    merged.description = older.description;
  }
  if (!merged.photoUrl?.trim() && older.photoUrl?.trim()) {
    merged.photoUrl = older.photoUrl;
  }
  return merged;
}

export function mergeCatalogHouseRow(
  current: PublicHouse | undefined,
  incoming: PublicHouse,
): PublicHouse {
  if (!current) return withExplicitStubFlag(incoming);
  const incomingWins =
    Date.parse(incoming.updatedAt) >= Date.parse(current.updatedAt);
  return incomingWins
    ? mergePublicHouseStubFields(incoming, current)
    : mergePublicHouseStubFields(current, incoming);
}

/** Copy `isStub` from deploy snapshot onto device cache rows (same ids, stripped detail). */
export function applySnapshotStubFlags(catalog: Catalog, snapshot: Catalog): Catalog {
  const snapById = new Map(snapshot.houses.map((house) => [house.id, house]));
  return {
    ...catalog,
    houses: catalog.houses.map((house) => {
      const snap = snapById.get(house.id);
      if (!snap || typeof snap.isStub !== "boolean") {
        return withExplicitStubFlag(house);
      }
      return mergePublicHouseStubFields({ ...house, isStub: snap.isStub }, house);
    }),
  };
}
