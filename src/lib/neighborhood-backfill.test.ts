import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  houseNeedsNeighborhoodBackfill,
  neighborhoodCalculatedLegacy,
  planNeighborhoodBackfill,
} from "@/lib/neighborhood-backfill";

describe("neighborhoodCalculatedLegacy", () => {
  it("uses zone when coords match הגפן", () => {
    assert.equal(
      neighborhoodCalculatedLegacy({
        address: "ז'בוטינסקי 105",
        lat: 32.08925,
        lng: 34.81205,
      }),
      "הגפן",
    );
  });

  it("returns null for south off-zone strip", () => {
    assert.equal(
      neighborhoodCalculatedLegacy({
        address: "הדר 11",
        lat: 32.08793,
        lng: 34.8123,
      }),
      null,
    );
  });

  it("respects explicit stored hood when not in false-Gefen case", () => {
    assert.equal(
      neighborhoodCalculatedLegacy({
        address: "איתמר 2",
        neighborhood: "חרוזים",
        lat: 32.090904,
        lng: 34.806806,
      }),
      "חרוזים",
    );
  });
});

describe("planNeighborhoodBackfill", () => {
  it("only touches missing neighborhood in missing mode", () => {
    const houses = [
      { id: "a", address: "x", lat: 32.08925, lng: 34.81205 },
      { id: "b", address: "y", neighborhood: "חרוזים" as const, lat: 32.09, lng: 34.81 },
      { id: "c", address: "z", neighborhood: null, lat: 32.08793, lng: 34.8123 },
    ];
    const changes = planNeighborhoodBackfill(houses, "missing");
    assert.equal(changes.length, 1);
    assert.equal(changes[0]?.id, "a");
    assert.equal(changes[0]?.to, "הגפן");
    assert.equal(houseNeedsNeighborhoodBackfill(houses[2]!, "missing"), false);
  });
});
