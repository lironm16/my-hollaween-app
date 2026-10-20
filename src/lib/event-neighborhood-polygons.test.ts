import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";
import {
  EVENT_NEIGHBORHOOD_POLYGON_RINGS,
  pointInEventNeighborhoodPolygon,
  pointInEventZoneRing,
} from "@/lib/event-neighborhood-polygons";

describe("event-neighborhood-polygons", () => {
  it("matches public/event-zones/hagefen.geojson ring", () => {
    const raw = readFileSync(join(process.cwd(), "public/event-zones/hagefen.geojson"), "utf8");
    const geo = JSON.parse(raw) as { geometry: { coordinates: [number, number][][] } };
    assert.deepEqual(geo.geometry.coordinates[0], EVENT_NEIGHBORHOOD_POLYGON_RINGS.הגפן);
  });

  it("includes Hashkediya 13 and center inside הגפן", () => {
    assert.equal(pointInEventNeighborhoodPolygon("הגפן", 32.08925, 34.81205), true);
    assert.equal(pointInEventNeighborhoodPolygon("הגפן", 32.088440010365, 34.811503009317), true);
  });

  it("excludes Yohanna 6 and Bialik 37", () => {
    assert.equal(pointInEventNeighborhoodPolygon("הגפן", 32.0883058, 34.8163387), false);
    assert.equal(pointInEventNeighborhoodPolygon("הגפן", 32.0849863, 34.8122928), false);
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
