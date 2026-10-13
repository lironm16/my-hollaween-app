import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  clampGemAnchorPlacement,
  gemAnchorPlacementError,
  GEM_ANCHOR_PLACE_MAX_METERS,
} from "@/lib/gem-anchor-placement";
import { automaticGemAnchorForHouse, destinationPoint, gemAnchorForHouse } from "@/lib/gem-hunt";
import {
  __resetPlacedGemAnchorsForTests,
  notePlacedGemAnchor,
  syncPlacedGemAnchors,
} from "@/lib/gem-placed-anchors";
import { distanceMeters } from "@/lib/geo";

const house = { id: "place-house", lat: 32.0919, lng: 34.8112, updatedAt: "2026-10-10T10:00:00.000Z" };

describe("gem anchor placement", () => {
  beforeEach(() => __resetPlacedGemAnchorsForTests());
  afterEach(() => __resetPlacedGemAnchorsForTests());

  it("accepts points inside the circle and rejects far ones", () => {
    const near = destinationPoint(house, 90, GEM_ANCHOR_PLACE_MAX_METERS - 5);
    const far = destinationPoint(house, 90, GEM_ANCHOR_PLACE_MAX_METERS + 10);
    assert.equal(gemAnchorPlacementError(house, near), null);
    assert.ok(gemAnchorPlacementError(house, far));
    assert.ok(gemAnchorPlacementError(house, { lat: Number.NaN, lng: 34 }));
  });

  it("clamps a dragged point back onto the circle", () => {
    const far = destinationPoint(house, 45, GEM_ANCHOR_PLACE_MAX_METERS * 3);
    const clamped = clampGemAnchorPlacement(house, far);
    assert.ok(distanceMeters(house, clamped) <= GEM_ANCHOR_PLACE_MAX_METERS + 0.05);
    assert.equal(gemAnchorPlacementError(house, clamped), null);
  });

  it("uses the shared placement from the catalog row", () => {
    const spot = destinationPoint(house, 180, 12);
    const row = { ...house, gemAnchor: { ...spot, updatedAt: house.updatedAt } };
    syncPlacedGemAnchors([row]);
    const anchor = gemAnchorForHouse(row);
    assert.equal(anchor.placed, true);
    assert.equal(anchor.lat, spot.lat);
    const auto = automaticGemAnchorForHouse(row);
    assert.notEqual(auto.placed, true);
    assert.notEqual(auto.lat, spot.lat);
  });

  it("keeps a just-saved placement until the catalog catches up, including a reset", () => {
    const spot = destinationPoint(house, 0, 15);
    const saved = { ...spot, updatedAt: "2026-10-12T08:00:00.000Z" };
    syncPlacedGemAnchors([house]);
    notePlacedGemAnchor(house.id, saved, saved.updatedAt);
    syncPlacedGemAnchors([house]);
    assert.equal(gemAnchorForHouse(house).placed, true);

    const caughtUp = { ...house, updatedAt: saved.updatedAt, gemAnchor: saved };
    syncPlacedGemAnchors([caughtUp]);
    notePlacedGemAnchor(house.id, null, "2026-10-12T09:00:00.000Z");
    syncPlacedGemAnchors([caughtUp]);
    assert.notEqual(gemAnchorForHouse(caughtUp).placed, true);
  });
});
