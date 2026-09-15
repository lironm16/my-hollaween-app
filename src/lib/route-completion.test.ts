import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isRouteFullyVisited, routeActiveHouseIds } from "@/lib/route-completion";
import type { WalkingRoute } from "@/lib/route";
import type { PublicHouse } from "@/lib/types";

function stub(id: string): PublicHouse {
  return {
    id,
    name: id,
    theme: "pumpkin",
    address: id,
    arrival: "",
    description: "",
    lat: 32.09,
    lng: 34.81,
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function route(ids: string[]): WalkingRoute {
  return {
    stops: ids.map((id, index) => ({
      house: stub(id),
      houses: [stub(id)],
      order: index + 1,
      fromPreviousMeters: 50,
      cumulativeMeters: 50 * (index + 1),
    })),
    totalMeters: 50 * ids.length,
    totalMinutes: 10,
    startedFrom: "neighborhood",
    origin: { lat: 32.09, lng: 34.81 },
    accessible: false,
  };
}

describe("routeActiveHouseIds", () => {
  it("excludes skipped houses", () => {
    assert.deepEqual(routeActiveHouseIds(route(["a", "b", "c"]), ["b"]), ["a", "c"]);
  });
});

describe("isRouteFullyVisited", () => {
  it("is true when every active stop is visited", () => {
    assert.equal(isRouteFullyVisited(route(["a", "b"]), [], ["a", "b"]), true);
  });

  it("ignores skipped stops", () => {
    assert.equal(isRouteFullyVisited(route(["a", "b"]), ["b"], ["a"]), true);
  });

  it("is false when active stops remain", () => {
    assert.equal(isRouteFullyVisited(route(["a", "b"]), [], ["a"]), false);
  });

  it("is false when every stop is skipped", () => {
    assert.equal(isRouteFullyVisited(route(["a"]), ["a"], []), false);
  });
});
