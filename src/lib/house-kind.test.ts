import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { effectiveHouseKind, houseMatchesLocationKind, isPoiHouse } from "@/lib/house-kind";
import type { PublicHouse } from "@/lib/types";

function house(patch: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id: "בית-1000",
    name: "test",
    theme: "pumpkin",
    address: "חרוזים 1",
    arrival: "",
    description: "",
    lat: 32.09,
    lng: 34.8,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    visit: "come",
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    notes: "",
    accessible: false,
    soldOut: false,
    adminFrozen: false,
    updatedAt: "2026-10-31T12:00:00.000Z",
    ...patch,
  } as PublicHouse;
}

describe("house kind", () => {
  it("defaults missing kind to house", () => {
    assert.equal(effectiveHouseKind(house()), "house");
    assert.equal(isPoiHouse(house()), false);
  });

  it("detects poi kind", () => {
    const poi = house({ id: "נק-9310", kind: "poi", poiCategory: "coffee" });
    assert.equal(effectiveHouseKind(poi), "poi");
    assert.equal(isPoiHouse(poi), true);
  });

  it("filters by location kind", () => {
    const poi = house({ kind: "poi" });
    assert.equal(houseMatchesLocationKind(house(), "all"), true);
    assert.equal(houseMatchesLocationKind(house(), "house"), true);
    assert.equal(houseMatchesLocationKind(poi, "poi"), true);
    assert.equal(houseMatchesLocationKind(poi, "house"), false);
  });
});
