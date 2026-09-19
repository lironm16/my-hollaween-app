import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalogHasRealHouses, isStubHouse } from "@/lib/house-set";
import type { PublicHouse } from "@/lib/types";

const MIN_TRUSTED_REAL_HOUSES = 5;

function cacheLooksIncomplete(catalog: { houses: PublicHouse[] } | null) {
  if (!catalog) return false;
  const realCount = catalog.houses.filter((house) => !isStubHouse(house)).length;
  return realCount > 0 && realCount < MIN_TRUSTED_REAL_HOUSES;
}

function house(id: string): PublicHouse {
  return {
    id,
    name: id,
    address: "רחוב 1",
    lat: 32.08,
    lng: 34.81,
    updatedAt: "2026-10-31T12:00:00.000Z",
    treats: [],
    treatStock: {},
    scareLevel: "mild",
    decorLevel: "some",
    candyTone: "mixed",
    visit: "open",
    hoursMode: "default",
  };
}

describe("cacheLooksIncomplete", () => {
  it("flags a single saved real house as incomplete", () => {
    const catalog = { houses: [house("בית-6895")] };
    assert.equal(catalogHasRealHouses(catalog), true);
    assert.equal(cacheLooksIncomplete(catalog), true);
  });

  it("does not flag a full catalog", () => {
    const catalog = { houses: Array.from({ length: 6 }, (_, i) => house(`בית-${1000 + i}`)) };
    assert.equal(cacheLooksIncomplete(catalog), false);
  });

  it("does not flag stub-only cache", () => {
    const catalog = { houses: [house("בית-9310")] };
    assert.equal(catalogHasRealHouses(catalog), false);
    assert.equal(cacheLooksIncomplete(catalog), false);
  });
});
