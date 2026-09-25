import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { distanceMeters } from "@/lib/geo";
import {
  bearingClockLabelHe,
  bearingDegrees,
  facingHouse,
  relativeWalkBearingDeg,
  gemAnchorForHouse,
  gemProximity,
  gemScreenPlacement,
  gemInScanRing,
  gemFamilyForHouse,
  gemVariantForHouse,
  headingDelta,
  userWithinGemHuntRange,
  withinGemHuntMeters,
  GEM_HUNT_METERS,
  GEM_ANCHOR_MIN_METERS,
  GEM_ANCHOR_MAX_METERS,
} from "@/lib/gem-hunt";

describe("gem hunt geo", () => {
  const house = { id: "gem-test-house", lat: 32.0919, lng: 34.8112 };

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
    const anchor = gemAnchorForHouse(house);
    const snapped = { lat: house.lat, lng: house.lng, accuracy: 400 };
    assert.equal(withinGemHuntMeters(snapped, anchor), false);
    assert.equal(gemProximity(snapped, house, false), "far");
    const near = { lat: anchor.lat, lng: anchor.lng, accuracy: 8 };
    assert.equal(withinGemHuntMeters(near, anchor), true);
  });

  it("pins each house gem at a stable offset from the map pin", () => {
    const a = gemAnchorForHouse(house);
    const b = gemAnchorForHouse(house);
    assert.equal(a.lat, b.lat);
    assert.ok(a.offsetM >= GEM_ANCHOR_MIN_METERS && a.offsetM <= GEM_ANCHOR_MAX_METERS);
    assert.ok(distanceMeters(house, a) >= GEM_ANCHOR_MIN_METERS - 0.5);
  });

  it("maps anchor bearing to horizontal screen position", () => {
    const anchor = gemAnchorForHouse(house);
    const user = { lat: house.lat + 0.00012, lng: house.lng };
    const heading = bearingDegrees(user, anchor);
    const place = gemScreenPlacement(user, anchor, heading);
    assert.ok(place);
    assert.equal(place!.inView, true);
    assert.ok(Math.abs(place!.xPercent - 50) < 8);
    assert.equal(gemInScanRing(place), true);
  });

  it("maps each house to a gem monster id", () => {
    assert.equal(gemFamilyForHouse({ id: "g1", theme: "ghost", kind: "house" }), "monster");
    const a = gemVariantForHouse({ id: "v1", theme: "vampire", kind: "house" });
    const b = gemVariantForHouse({ id: "v1", theme: "vampire", kind: "house" });
    assert.equal(a, b);
    assert.equal(a, "dragon");
  });

  it("detects facing within tolerance", () => {
    const user = { lat: 32.0915, lng: 34.8112 };
    const target = bearingDegrees(user, house);
    assert.equal(facingHouse(user, house, target, 30), true);
    assert.equal(facingHouse(user, house, target + 90, 30), false);
  });

  it("computes relative walk bearing for on-screen arrow", () => {
    const user = { lat: 32.0915, lng: 34.8112 };
    const target = bearingDegrees(user, house);
    assert.equal(relativeWalkBearingDeg(user, house, target), 0);
    assert.ok(Math.abs(relativeWalkBearingDeg(user, house, target + 90) ?? 0) > 80);
  });

  it("normalizes heading delta across north", () => {
    assert.equal(headingDelta(350, 10), 20);
    assert.equal(headingDelta(10, 350), 20);
  });

  it("userWithinGemHuntRange uses gem anchor band", () => {
    const anchor = gemAnchorForHouse(house);
    assert.equal(userWithinGemHuntRange({ lat: anchor.lat, lng: anchor.lng, accuracy: 8 }, house), true);
    assert.equal(
      userWithinGemHuntRange({ lat: house.lat + 0.004, lng: house.lng, accuracy: 8 }, house),
      false,
    );
  });
});

describe("gem hunt gate", () => {
  it("shows only for admin", async () => {
    const { gemHuntVisible } = await import("@/lib/gem-hunt-enabled");
    assert.equal(gemHuntVisible(true), true);
    assert.equal(gemHuntVisible(false), false);
  });

  it("bearingClockLabelHe maps compass octants", () => {
    assert.equal(bearingClockLabelHe(0), "צפון");
    assert.equal(bearingClockLabelHe(90), "מזרח");
    assert.equal(bearingClockLabelHe(180), "דרום");
  });

  it("fab and house treasure hide during add-house hours", async () => {
    const { gemHuntFabVisible } = await import("@/lib/gem-hunt-enabled");
    const huntEvening = new Date(2026, 9, 31, 18, 0, 0, 0);
    const addHouseAfternoon = new Date(2026, 9, 31, 16, 30, 0, 0);
    assert.equal(gemHuntFabVisible(true, huntEvening), true);
    assert.equal(gemHuntFabVisible(true, addHouseAfternoon), false);
    assert.equal(gemHuntFabVisible(false, huntEvening), false);
  });
});
