import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { walkRouteLookaheadTarget, walkRouteTurnBearingDeg } from "@/lib/gem-walk-route-bearing";

describe("gem walk route bearing", () => {
  const user = { lat: 32.091, lng: 34.808 };
  const route = [
    { lat: 32.091, lng: 34.808 },
    { lat: 32.091, lng: 34.8095 },
    { lat: 32.092, lng: 34.811 },
  ];

  it("lookahead target advances along the polyline", () => {
    const target = walkRouteLookaheadTarget(user, route);
    assert.ok(target);
    assert.ok(target!.lng >= 34.809);
  });

  it("turn bearing is phone-relative when heading is set", () => {
    const turn = walkRouteTurnBearingDeg(user, 90, route);
    assert.ok(turn != null);
    assert.ok(Math.abs(turn!) < 90);
  });
});
