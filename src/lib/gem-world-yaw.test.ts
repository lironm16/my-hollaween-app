import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gemWorldYawRad } from "@/lib/gem-world-yaw";

describe("gem world yaw", () => {
  const anchor = { lat: 32.092, lng: 34.81 };

  it("changes when viewer walks to different sides of anchor", () => {
    const north = { lat: 32.09205, lng: 34.81 };
    const south = { lat: 32.09195, lng: 34.81 };
    const a = gemWorldYawRad(anchor, north);
    const b = gemWorldYawRad(anchor, south);
    assert.ok(Math.abs(a - b) > 2.5, "yaw should differ by ~180° when on opposite sides");
  });
});
