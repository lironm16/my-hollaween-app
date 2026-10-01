import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  averageGeoSamples,
  eastNorthOffsetMeters,
  geoPlacementReady,
  viewerLocalOffsetMeters,
} from "@/lib/gem-webxr-geospatial";

describe("gem-webxr-geospatial", () => {
  const target = { lat: 32.090303, lng: 34.80975 };

  it("computes east/north offset", () => {
    const user = { lat: 32.09025, lng: 34.80975 };
    const { east, north } = eastNorthOffsetMeters(user, target);
    assert.ok(Math.abs(east) < 2);
    assert.ok(north > 0 && north < 12);
  });

  it("places target ahead when facing it", () => {
    const user = { lat: 32.0901, lng: 34.80975, accuracy: 8 };
    const heading = 0;
    const off = viewerLocalOffsetMeters(user, target, heading);
    assert.ok(off.z < 0);
    assert.ok(Math.abs(off.x) < 3);
  });

  it("requires stable samples before geo lock", () => {
    const samples = [
      { lat: 32.09028, lng: 34.80974, accuracy: 12 },
      { lat: 32.09029, lng: 34.80975, accuracy: 11 },
      { lat: 32.09028, lng: 34.80976, accuracy: 10 },
    ];
    assert.equal(geoPlacementReady(samples, 45, target), true);
    assert.equal(geoPlacementReady(samples.slice(0, 1), 45, target), false);
  });

  it("averages GPS samples", () => {
    const avg = averageGeoSamples([
      { lat: 1, lng: 2, accuracy: 10 },
      { lat: 3, lng: 4, accuracy: 14 },
    ]);
    assert.equal(avg!.lat, 2);
    assert.equal(avg!.lng, 3);
    assert.equal(avg!.accuracy, 12);
  });
});
