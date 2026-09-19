import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cycleListSort, sortHousesForList } from "@/lib/list-sort";
import type { PublicHouse } from "@/lib/types";

const now = new Date("2026-10-31T18:00:00.000Z");
const origin = { lat: 32.08, lng: 34.81 };

function house(partial: Partial<PublicHouse> & Pick<PublicHouse, "id" | "name">): PublicHouse {
  return {
    theme: "pumpkin",
    address: "רחוב 1",
    arrival: "",
    description: "",
    lat: 32.081,
    lng: 34.811,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    openHours: [{ from: "17:00", to: "21:00" }],
    notes: "",
    accessible: false,
    visit: "come",
    decorLevel: "mild",
    decorated: true,
    soldOut: false,
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    ...partial,
  };
}

describe("list-sort", () => {
  it("cycles sort modes in order", () => {
    assert.equal(cycleListSort("nearby", 1), "added");
    assert.equal(cycleListSort("nearby", -1), "name");
  });

  it("sorts by distance for nearby", () => {
    const sorted = sortHousesForList(
      [
        house({ id: "far", name: "רחוק", lat: 32.09, lng: 34.82 }),
        house({ id: "near", name: "קרוב", lat: 32.0805, lng: 34.8105 }),
      ],
      "nearby",
      origin,
      now,
    );
    assert.deepEqual(
      sorted.map((item) => item.house.id),
      ["near", "far"],
    );
  });

  it("sorts by createdAt for added", () => {
    const sorted = sortHousesForList(
      [
        house({ id: "old", name: "ישן", createdAt: "2026-09-01T12:00:00.000Z" }),
        house({ id: "new", name: "חדש", createdAt: "2026-10-20T12:00:00.000Z" }),
      ],
      "added",
      origin,
      now,
    );
    assert.deepEqual(
      sorted.map((item) => item.house.id),
      ["new", "old"],
    );
  });

  it("sorts alphabetically for name", () => {
    const sorted = sortHousesForList(
      [house({ id: "b", name: "תמר" }), house({ id: "a", name: "אביב" })],
      "name",
      origin,
      now,
    );
    assert.deepEqual(
      sorted.map((item) => item.house.id),
      ["a", "b"],
    );
  });
});
