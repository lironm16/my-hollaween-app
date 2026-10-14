import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildWalkingRouteOrdered } from "@/lib/route";
import type { PublicHouse } from "@/lib/types";
import {
  approachLegDone,
  routePrefixStopCount,
  routeProgressSegments,
  stopHasRemainingActive,
} from "@/lib/route-session-progress";

function stub(id: string, lat: number, lng: number): PublicHouse {
  return {
    id,
    name: id,
    theme: "pumpkin",
    address: `addr ${id}`,
    neighborhood: "חרוזים",
    arrival: "",
    description: "",
    lat,
    lng,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    visit: "come",
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    openHours: [{ from: "17:00", to: "21:00" }],
    openFrom2: "",
    openTo2: "",
    notes: "",
    accessible: true,
    decorLevel: "medium",
    decorated: true,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    createdAt: "",
    updatedAt: "",
  };
}

describe("routeProgressSegments", () => {
  it("greens a leg when both endpoint stops are done, even with a gap earlier", () => {
    const houses = [
      stub("a", 32.091, 34.801),
      stub("b", 32.092, 34.802),
      stub("c", 32.093, 34.803),
    ];
    const route = buildWalkingRouteOrdered(houses, { lat: 32.09, lng: 34.81 });
    assert.ok(route);
    const segments = routeProgressSegments(route, ["c"], []);
    assert.equal(segments.length, 2);
    assert.equal(segments[0]!.done, false);
    assert.equal(segments[1]!.done, false);

    const both = routeProgressSegments(route, ["b", "c"], []);
    assert.equal(both[0]!.done, false);
    assert.equal(both[1]!.done, true);
  });

  it("greens leg 1→2 after visiting stops 1 and 2 in order", () => {
    const houses = [
      stub("a", 32.091, 34.801),
      stub("b", 32.092, 34.802),
      stub("c", 32.1, 34.81),
    ];
    const route = buildWalkingRouteOrdered(houses, { lat: 32.09, lng: 34.81 });
    assert.ok(route);
    assert.equal(routeProgressSegments(route, ["a"], [])[0]!.done, false);
    assert.equal(routeProgressSegments(route, ["a", "b"], [])[0]!.done, true);
  });
});

describe("stopHasRemainingActive", () => {
  it("still has active houses when only one apartment is skipped", () => {
    const route = buildWalkingRouteOrdered(
      [stub("a", 32.091, 34.801)],
      { lat: 32.09, lng: 34.81 },
    );
    assert.ok(route);
    const stop = {
      ...route.stops[0]!,
      houses: [stub("apt1", 32.091, 34.801), stub("apt2", 32.091, 34.801)],
    };
    assert.equal(stopHasRemainingActive(stop, ["apt1"], ["apt2"]), true);
    assert.equal(stopHasRemainingActive(stop, ["apt1"], []), true);
    assert.equal(stopHasRemainingActive(stop, ["apt1", "apt2"], []), false);
  });
});

describe("approachLegDone", () => {
  it("follows first stop completion", () => {
    const route = buildWalkingRouteOrdered([stub("a", 32.091, 34.801)], { lat: 32.09, lng: 34.81 });
    assert.ok(route);
    assert.equal(approachLegDone(route, [], []), false);
    assert.equal(approachLegDone(route, ["a"], []), true);
  });
});

describe("routePrefixStopCount", () => {
  it("counts a contiguous visited prefix", () => {
    const houses = [stub("a", 32.091, 34.801), stub("b", 32.092, 34.802), stub("c", 32.093, 34.803)];
    const route = buildWalkingRouteOrdered(houses, { lat: 32.09, lng: 34.81 });
    assert.ok(route);
    assert.equal(routePrefixStopCount(route, ["a", "b"], []), 2);
  });
});
