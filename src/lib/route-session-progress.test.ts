import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildWalkingRouteOrdered } from "@/lib/route";
import type { PublicHouse } from "@/lib/types";
import {
  approachLegDone,
  nextUnvisitedStopIndex,
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
  it("keeps full tour legs; orphan visits stay orange until bridged", () => {
    const houses = [
      stub("a", 32.091, 34.801),
      stub("b", 32.092, 34.802),
      stub("c", 32.093, 34.803),
    ];
    const route = buildWalkingRouteOrdered(houses, { lat: 32.09, lng: 34.81 });
    assert.ok(route);
    assert.equal(routeProgressSegments(route, ["c"], []).length, 2);
    assert.equal(routeProgressSegments(route, ["c"], [])[1]!.done, false);
    const bridged = routeProgressSegments(route, ["b", "c"], []);
    assert.equal(bridged.length, 2);
    assert.equal(bridged[1]!.done, true);
  });

  it("keeps legs through a skipped stop", () => {
    const houses = [
      stub("a", 32.091, 34.801),
      stub("b", 32.092, 34.802),
      stub("c", 32.1, 34.81),
    ];
    const route = buildWalkingRouteOrdered(houses, { lat: 32.09, lng: 34.81 });
    assert.ok(route);
    assert.equal(routeProgressSegments(route, [], ["b"]).length, 2);
  });
});

describe("nextUnvisitedStopIndex", () => {
  it("targets the first open stop after completed prefix", () => {
    const route = buildWalkingRouteOrdered(
      [stub("a", 32.091, 34.801), stub("b", 32.092, 34.802)],
      { lat: 32.09, lng: 34.81 },
    );
    assert.ok(route);
    assert.equal(nextUnvisitedStopIndex(route, [], []), 0);
    assert.equal(nextUnvisitedStopIndex(route, ["a"], []), 1);
    assert.equal(nextUnvisitedStopIndex(route, ["a", "b"], []), null);
  });
});

describe("approachLegDone", () => {
  it("is green once the prefix before the next target is complete", () => {
    const route = buildWalkingRouteOrdered(
      [stub("a", 32.091, 34.801), stub("b", 32.092, 34.802)],
      { lat: 32.09, lng: 34.81 },
    );
    assert.ok(route);
    assert.equal(approachLegDone(route, [], []), false);
    assert.equal(approachLegDone(route, ["a"], []), true);
  });
});

describe("stopHasRemainingActive", () => {
  it("still has active houses when only one apartment is skipped", () => {
    const route = buildWalkingRouteOrdered([stub("a", 32.091, 34.801)], { lat: 32.09, lng: 34.81 });
    assert.ok(route);
    const stop = {
      ...route.stops[0]!,
      houses: [stub("apt1", 32.091, 34.801), stub("apt2", 32.091, 34.801)],
    };
    assert.equal(stopHasRemainingActive(stop, [], ["apt2"]), true);
    assert.equal(stopHasRemainingActive(stop, ["apt1"], ["apt2"]), false);
  });
});
