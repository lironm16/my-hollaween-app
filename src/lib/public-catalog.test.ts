import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { housesForPublicCatalog } from "@/lib/public-catalog";
import type { House } from "@/lib/types";

function house(id: string, description = ""): House {
  return {
    id,
    name: id,
    theme: "pumpkin",
    address: "חרוזים 1",
    arrival: "",
    description,
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
    editCode: "123456",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("housesForPublicCatalog", () => {
  it("omits rehearsal stubs by default", () => {
    const published = housesForPublicCatalog([
      house("בית-1000"),
      house("בית-9310", "סטאב לחזרה"),
    ]);
    assert.deepEqual(published.map((item) => item.id), ["בית-1000"]);
  });

  it("can include stubs for admin export", () => {
    const published = housesForPublicCatalog(
      [house("בית-1000"), house("בית-9310", "סטאב לחזרה")],
      true,
    );
    assert.equal(published.length, 2);
  });
});
