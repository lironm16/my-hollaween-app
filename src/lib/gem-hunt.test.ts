import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { distanceMeters } from "@/lib/geo";
import {
  bearingDegrees,
  facingHouse,
  gemProximity,
  gemFamilyForHouse,
  gemVariantForHouse,
  headingDelta,
  withinGemHuntMeters,
  GEM_HUNT_METERS,
} from "@/lib/gem-hunt";

describe("gem hunt geo", () => {
  const house = { lat: 32.0919, lng: 34.8112 };

  it("classifies proximity bands", () => {
    assert.equal(gemProximity(null, house, false), "far");
    assert.equal(gemProximity({ ...house, accuracy: 8 }, house, false), "hunt");
    assert.equal(gemProximity(house, house, true), "collected");
    assert.equal(
      gemProximity({ lat: house.lat + 0.00035, lng: house.lng, accuracy: 12 }, house, false),
      "approach",
    );
  });

  it("does not treat a far fix snapped onto the pin as hunt range", () => {
    const snapped = { lat: house.lat, lng: house.lng, accuracy: 400 };
    assert.equal(withinGemHuntMeters(snapped, house), false);
    assert.equal(gemProximity(snapped, house, false), "far");
    const near = { lat: house.lat + 0.00008, lng: house.lng, accuracy: 15 };
    assert.ok(distanceMeters(near, house) <= GEM_HUNT_METERS);
    assert.equal(withinGemHuntMeters(near, house), true);
  });

  it("maps each house to a stable Akochan pet", () => {
    assert.equal(gemFamilyForHouse({ id: "g1", theme: "ghost", kind: "house" }), "monster");
    const a = gemVariantForHouse({ id: "v1", theme: "vampire", kind: "house" });
    const b = gemVariantForHouse({ id: "v1", theme: "vampire", kind: "house" });
    assert.equal(a, b);
    assert.notEqual(a, "");
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
