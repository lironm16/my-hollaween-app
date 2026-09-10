import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { distanceMeters } from "@/lib/geo";
import { estimateWalkingMeters } from "@/lib/walk-distance-estimate";

describe("estimateWalkingMeters", () => {
  it("prefers the southern east stop when hopping from the west above the hill", () => {
    const from = { lat: 32.0976, lng: 34.8105 };
    const northEast = { lat: 32.0985, lng: 34.8140 };
    const southEast = { lat: 32.0978, lng: 34.8145 };
    const toNorth = estimateWalkingMeters(from, northEast);
    const toSouth = estimateWalkingMeters(from, southEast);
    assert.ok(toSouth < toNorth);
    assert.ok(toNorth > distanceMeters(from, northEast));
  });

  it("keeps short hops on straight-line distance", () => {
    const a = { lat: 32.0919, lng: 34.8112 };
    const b = { lat: 32.0920, lng: 34.8114 };
    assert.equal(estimateWalkingMeters(a, b), distanceMeters(a, b));
  });
});
