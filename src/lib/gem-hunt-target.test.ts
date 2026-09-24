import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isNearAnyGem, pickGemHuntTarget } from "@/lib/gem-hunt-target";
import type { PublicHouse } from "@/lib/types";

const base = (id: string, lat: number, lng: number): PublicHouse =>
  ({
    id,
    lat,
    lng,
    theme: "ghost",
    kind: "house",
    name: id,
    address: id,
  }) as PublicHouse;

describe("pickGemHuntTarget", () => {
  const houses = [base("a", 32.0, 34.0), base("b", 32.0002, 34.0)];

  it("prefers selected house when not collected", () => {
    const user = { lat: 32.0, lng: 34.0 };
    const t = pickGemHuntTarget(houses, user, () => false, "b");
    assert.equal(t?.house.id, "b");
  });

  it("detects near gems", () => {
    const user = { lat: 32.0, lng: 34.0 };
    assert.equal(isNearAnyGem(houses, user, () => false), true);
    assert.equal(isNearAnyGem(houses, user, () => true), false);
  });
});
