import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeVisibleHouses } from "@/hooks/use-merged-houses";
import type { House, PublicHouse } from "@/lib/types";

function publicHouse(id: string, updatedAt: string): PublicHouse {
  return {
    id,
    name: `בית ${id}`,
    theme: "pumpkin",
    address: "חרוזים",
    arrival: "",
    description: "",
    lat: 32.09,
    lng: 34.81,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    visit: "come",
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    notes: "",
    accessible: false,
    status: "approved",
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    createdAt: updatedAt,
    updatedAt,
  } as PublicHouse;
}

function adminHouse(id: string, updatedAt: string, status: House["status"] = "approved"): House {
  return {
    ...publicHouse(id, updatedAt),
    editCode: "123456",
    status,
  } as House;
}

describe("mergeVisibleHouses", () => {
  it("includes catalog and admin houses when includeCatalogWhenAdmin is true", () => {
    const merged = mergeVisibleHouses({
      catalogHouses: [publicHouse("catalog-only", "2026-10-31T10:00:00.000Z")],
      owned: [],
      admin: true,
      adminHouses: [adminHouse("admin-only", "2026-10-31T10:00:00.000Z")],
      includeCatalogWhenAdmin: true,
    });
    assert.deepEqual(merged.map((house) => house.id).sort(), ["admin-only", "catalog-only"]);
  });

  it("uses admin houses only on the map when includeCatalogWhenAdmin is false", () => {
    const merged = mergeVisibleHouses({
      catalogHouses: [publicHouse("catalog-only", "2026-10-31T10:00:00.000Z")],
      owned: [],
      admin: true,
      adminHouses: [adminHouse("admin-only", "2026-10-31T10:00:00.000Z")],
    });
    assert.deepEqual(merged.map((house) => house.id), ["admin-only"]);
  });
});
