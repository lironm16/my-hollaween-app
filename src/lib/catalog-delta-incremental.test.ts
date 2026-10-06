import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCatalogDeltaFromDb } from "@/lib/store/catalog";
import { normalizeHouse } from "@/lib/store/core";
import type { DbFile, House } from "@/lib/types";

function house(id: string, updatedAt: string): House {
  return normalizeHouse({
    id,
    storeId: id,
    name: "test",
    theme: "pumpkin",
    address: "street",
    arrival: "",
    description: "",
    lat: 32.09,
    lng: 34.81,
    updatedAt,
    createdAt: updatedAt,
    visit: "come",
    treatStock: { candy: "plenty" },
    treats: ["candy"],
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    notes: "",
    accessible: false,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    editCode: "123456",
    kind: "house",
  });
}

describe("buildCatalogDeltaFromDb", () => {
  it("returns only houses newer than since", () => {
    const db: DbFile = {
      updatedAt: "2026-10-31T12:00:00.000Z",
      houses: [
        house("a", "2026-10-31T10:00:00.000Z"),
        house("b", "2026-10-31T13:00:00.000Z"),
      ],
      pushSubscriptions: [],
    };
    const delta = buildCatalogDeltaFromDb(db, "2026-10-31T11:00:00.000Z", []);
    assert.equal(delta.houses.length, 1);
    assert.equal(delta.houses[0]?.id, "b");
    assert.deepEqual(delta.removed, []);
  });
});
