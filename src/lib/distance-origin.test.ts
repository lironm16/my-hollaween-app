import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  neighborhoodOrigin,
  originLabel,
  resolveDistanceOrigin,
  type DistanceOriginChoice,
} from "@/lib/distance-origin";
import { config } from "@/lib/config";

describe("originLabel", () => {
  it("ORIGIN-01 labels neighborhood center in Hebrew", () => {
    assert.equal(originLabel({ kind: "neighborhood" }), "ממרכז השכונה");
  });

  it("ORIGIN-02 labels GPS origin in Hebrew", () => {
    assert.equal(originLabel({ kind: "gps" }), "מיקום נוכחי");
  });
});

describe("resolveDistanceOrigin", () => {
  it("ORIGIN-02 resolves GPS coordinates when GPS fix is available", () => {
    const resolved = resolveDistanceOrigin({ kind: "gps" }, { lat: 32.09, lng: 34.8 });
    assert.equal(resolved.kind, "gps");
    assert.equal(resolved.lat, 32.09);
    assert.equal(resolved.lng, 34.8);
    assert.equal(resolved.fromGps, true);
  });

  it("ORIGIN-03 resolves custom map-pick coordinates", () => {
    const choice: DistanceOriginChoice = {
      kind: "custom",
      lat: 32.091,
      lng: 34.803,
      label: "חרוזים 8",
    };
    const resolved = resolveDistanceOrigin(choice, null);
    assert.equal(resolved.kind, "custom");
    assert.equal(resolved.label, "חרוזים 8");
    assert.equal(resolved.fromGps, false);
  });

  it("uses saved GPS coordinates when live GPS is unavailable", () => {
    const resolved = resolveDistanceOrigin({ kind: "gps", lat: 32.091, lng: 34.803 }, null);
    assert.equal(resolved.kind, "gps");
    assert.equal(resolved.lat, 32.091);
    assert.equal(resolved.lng, 34.803);
    assert.equal(resolved.fromGps, true);
  });

  it("keeps gps origin kind while waiting for a fresh fix", () => {
    const resolved = resolveDistanceOrigin({ kind: "gps" }, null);
    assert.equal(resolved.kind, "gps");
    assert.equal(resolved.label, "מיקום נוכחי");
    assert.equal(resolved.fromGps, false);
  });
});

describe("neighborhoodOrigin", () => {
  it("uses the configured map center", () => {
    const origin = neighborhoodOrigin();
    assert.equal(origin.kind, "neighborhood");
    assert.equal(origin.lat, config.map.center.lat);
    assert.equal(origin.lng, config.map.center.lng);
  });
});
