import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { houseFromWarmCaches } from "@/lib/store/houses";
import { normalizeHouse, setGlobalDb, setMem } from "@/lib/store/core";
import type { DbFile, House } from "@/lib/types";

function house(id: string): House {
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
    updatedAt: "2026-10-31T12:00:00.000Z",
    createdAt: "2026-10-31T12:00:00.000Z",
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

describe("houseFromWarmCaches", () => {
  it("finds a house in warm mem without loading the full db", () => {
    const db: DbFile = {
      updatedAt: "2026-10-31T12:00:00.000Z",
      houses: [house("abc")],
      pushSubscriptions: [],
    };
    setMem(db);
    assert.equal(houseFromWarmCaches("abc")?.id, "abc");
  });

  it("falls back to global db", () => {
    setMem({ updatedAt: "", houses: [], pushSubscriptions: [] });
    setGlobalDb({
      updatedAt: "2026-10-31T12:00:00.000Z",
      houses: [house("global")],
      pushSubscriptions: [],
    });
    assert.equal(houseFromWarmCaches("global")?.id, "global");
  });
});
