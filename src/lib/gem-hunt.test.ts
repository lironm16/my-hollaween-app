import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bearingDegrees,
  facingHouse,
  gemProximity,
  gemTypeForHouse,
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

  it("maps house themes to gem types", () => {
    assert.equal(gemTypeForHouse({ theme: "ghost" }), "ghost");
    assert.equal(gemTypeForHouse({ theme: "pumpkin" }), "pumpkin");
    assert.equal(gemTypeForHouse({ theme: "vampire" }), "crystal");
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
