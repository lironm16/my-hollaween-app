import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bearingDegrees,
  facingHouse,
  gemProximity,
  gemFamilyForHouse,
  gemVariantForHouse,
  headingDelta,
} from "@/lib/gem-hunt";

describe("gem hunt geo", () => {
  const house = { lat: 32.0919, lng: 34.8112 };

  it("classifies proximity bands", () => {
    assert.equal(gemProximity(null, house, false), "far");
    assert.equal(gemProximity(house, house, false), "hunt");
    assert.equal(gemProximity(house, house, true), "collected");
    assert.equal(
      gemProximity({ lat: house.lat + 0.00035, lng: house.lng }, house, false),
      "approach",
    );
  });

  it("maps every house to the Molotov dragon monster", () => {
    assert.equal(gemFamilyForHouse({ id: "g1", theme: "ghost", kind: "house" }), "monster");
    assert.equal(gemVariantForHouse({ id: "v1", theme: "vampire", kind: "house" }), "dragon");
  });

  it("detects facing within tolerance", () => {
    const user = { lat: 32.0915, lng: 34.8112 };
    const target = bearingDegrees(user, house);
    assert.equal(facingHouse(user, house, target, 30), true);
    assert.equal(facingHouse(user, house, target + 90, 30), false);
  });

  it("normalizes heading delta across north", () => {
    assert.equal(headingDelta(350, 10), 20);
    assert.equal(headingDelta(10, 350), 20);
  });
});

describe("gem hunt gate", () => {
  it("shows only for admin", async () => {
    const { gemHuntVisible } = await import("@/lib/gem-hunt-enabled");
    assert.equal(gemHuntVisible(true), true);
    assert.equal(gemHuntVisible(false), false);
  });
});
