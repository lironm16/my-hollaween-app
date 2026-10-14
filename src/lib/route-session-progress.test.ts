import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildWalkingRouteOrdered } from "@/lib/route";
import type { PublicHouse } from "@/lib/types";
import {
  isInOrderRouteVisit,
  routePrefixStopCount,
  routeSegmentDoneThroughStop,
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

describe("routePrefixStopCount", () => {
  it("counts a contiguous visited prefix", () => {
    const houses = [stub("a", 32.091, 34.801), stub("b", 32.092, 34.802), stub("c", 32.093, 34.803)];
    const route = buildWalkingRouteOrdered(houses, { lat: 32.09, lng: 34.81 });
    assert.ok(route);
    assert.equal(routePrefixStopCount(route, ["a", "b"], []), 2);
    assert.equal(routePrefixStopCount(route, ["a", "c"], []), 1);
  });
});

describe("isInOrderRouteVisit", () => {
  it("allows the next stop in order", () => {
    const houses = [stub("a", 32.091, 34.801), stub("b", 32.092, 34.802)];
    const plan = buildWalkingRouteOrdered(houses, { lat: 32.09, lng: 34.81 });
    assert.ok(plan);
    assert.equal(isInOrderRouteVisit(plan, "a", [], [], true), true);
    assert.equal(isInOrderRouteVisit(plan, "b", ["a"], [], true), true);
    assert.equal(isInOrderRouteVisit(plan, "b", [], [], true), false);
  });
});

describe("routeSegmentDoneThroughStop", () => {
  it("marks segments up to the visited prefix", () => {
    assert.equal(routeSegmentDoneThroughStop(2, 0), true);
    assert.equal(routeSegmentDoneThroughStop(2, 1), true);
    assert.equal(routeSegmentDoneThroughStop(2, 2), false);
  });
});
