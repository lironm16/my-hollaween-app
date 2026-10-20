import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  eventNeighborhoodPolygonIds,
  eventNeighborhoodPolygonRings,
  pointInEventNeighborhoodPolygon,
  pointInEventZoneRing,
} from "@/lib/event-neighborhood-polygons";

describe("event-neighborhood-polygons", () => {
  it("loads Gov rings for all four event hoods", () => {
    assert.deepEqual(eventNeighborhoodPolygonIds().sort(), [
      "הגפן",
      "חרוזים",
      "נחלת גנים",
      "שיכון ותיקים",
    ].sort());
    for (const id of eventNeighborhoodPolygonIds()) {
      assert.ok(eventNeighborhoodPolygonRings(id).length > 0);
    }
  });

  it("includes Hashkediya 13 inside הגפן (Gov polygon)", () => {
    assert.equal(pointInEventNeighborhoodPolygon("הגפן", 32.088440010365, 34.811503009317), true);
  });

  it("excludes Yohanna 6 from הגפן", () => {
    assert.equal(pointInEventNeighborhoodPolygon("הגפן", 32.0883058, 34.8163387), false);
  });

  it("pointInEventZoneRing handles closed rings", () => {
    const ring: [number, number][] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
      [0, 0],
    ];
    assert.equal(pointInEventZoneRing(1, 1, ring), true);
    assert.equal(pointInEventZoneRing(3, 3, ring), false);
  });
});
