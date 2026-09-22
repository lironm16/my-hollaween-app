import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  diffRouteByFilters,
  diffRouteBySkippedIds,
  rebuildRouteAfterFilterChange,
  rebuildRouteAfterSkipChange,
  routeCandidateHouses,
  whyAddedToRoute,
  whyRemovedFromRoute,
} from "@/lib/route-changes";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";
import { buildWalkingRouteOrdered } from "@/lib/route";

function stub(id: string, overrides: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id,
    name: id,
    theme: "pumpkin",
    address: `addr ${id}`,
    arrival: "",
    description: "",
    lat: 32.0919,
    lng: 34.8112,
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
    ...overrides,
  };
}

const baseFilters: HouseFiltersState = {
  accessibleOnly: false,
  openNowOnly: false,
  closingSoonOnly: false,
  openingSoonOnly: false,
  notYetOpenOnly: false,
  onBreakOnly: false,
  afterHoursOnly: false,
  visitWindowMode: "all",
  visitWindowFrom: "",
  visitWindowTo: "",
  closedOnly: false,
  decorOnlyOnly: false,
  sensitivityFilters: [],
  scareFilters: ["mild", "medium", "spicy"],
  candyFilters: ["none", "plenty", "low", "out"],
  neighborhoodFilters: ["חרוזים", "נחלת גנים", "שיכון ותיקים"],
  likedOnly: false,
  unvisitedOnly: false,
  visitedOnly: false,
  skippedOnly: false,
  includeUndecorated: true,
};

describe("routeCandidateHouses", () => {
  it("excludes skipped houses from route candidates", () => {
    const houses = [stub("a"), stub("b")];
    const context = {
      houseSet: "real" as const,
      likedIds: [],
      visitedIds: [],
      skippedIds: ["a"],
      now: new Date("2026-10-31T18:00:00"),
    };
    const candidates = routeCandidateHouses(houses, baseFilters, context);
    assert.deepEqual(candidates.map((house) => house.id), ["b"]);
  });

  it("excludes visited houses from route candidates", () => {
    const houses = [stub("a"), stub("b")];
    const context = {
      houseSet: "real" as const,
      likedIds: [],
      visitedIds: ["a"],
      skippedIds: [],
      now: new Date("2026-10-31T18:00:00"),
    };
    const candidates = routeCandidateHouses(houses, baseFilters, context);
    assert.deepEqual(candidates.map((house) => house.id), ["b"]);
  });
});

describe("diffRouteBySkippedIds", () => {
  it("marks restored houses as added to the route", () => {
    const house = stub("a");
    const open = stub("b");
    const route = buildWalkingRouteOrdered([open], { lat: 32.0919, lng: 34.8112 });
    const context = {
      houseSet: "real" as const,
      likedIds: [],
      visitedIds: [],
      skippedIds: ["a"],
      now: new Date("2026-10-31T18:00:00"),
    };
    const { added } = diffRouteBySkippedIds(route, [house, open], baseFilters, context, []);
    assert.equal(added.length, 1);
    assert.equal(added[0]?.name, "a");
  });

  it("marks newly skipped route houses as removed", () => {
    const house = stub("a");
    const route = buildWalkingRouteOrdered([house], { lat: 32.0919, lng: 34.8112 });
    const context = {
      houseSet: "real" as const,
      likedIds: [],
      visitedIds: [],
      skippedIds: [],
      now: new Date("2026-10-31T18:00:00"),
    };
    const { removed } = diffRouteBySkippedIds(route, [house], baseFilters, context, ["a"]);
    assert.equal(removed.length, 1);
    assert.equal(removed[0]?.reason, "דילגתם על הבית");
  });
});

describe("rebuildRouteAfterSkipChange", () => {
  it("drops visited houses from the route without re-optimizing remaining stops", () => {
    const origin = { lat: 32.0919, lng: 34.8112 };
    const first = stub("first", { lat: 32.09195, lng: 34.81125 });
    const second = stub("second", { lat: 32.092, lng: 34.8113 });
    const route = buildWalkingRouteOrdered([first, second], origin);
    const context = {
      houseSet: "real" as const,
      likedIds: [],
      visitedIds: ["first"],
      skippedIds: [],
      now: new Date("2026-10-31T18:00:00"),
    };
    const rebuilt = rebuildRouteAfterSkipChange(
      route,
      [first, second],
      baseFilters,
      context,
      [],
      false,
      origin,
    );
    assert.ok(rebuilt);
    assert.deepEqual(
      rebuilt!.stops.map((stop) => stop.house.id),
      ["second"],
    );
  });

  it("inserts restored houses at the best stop order, not always last", () => {
    const origin = { lat: 32.0919, lng: 34.8112 };
    const near = stub("near", { lat: 32.09195, lng: 34.81125, address: "חרוזים 8, חרוזים" });
    const far = stub("far", { lat: 32.094, lng: 34.818, address: "נחלת גנים 1, נחלת גנים" });
    const route = buildWalkingRouteOrdered([far], origin);
    const context = {
      houseSet: "real" as const,
      likedIds: [],
      visitedIds: [],
      skippedIds: ["near"],
      now: new Date("2026-10-31T18:00:00"),
    };
    const rebuilt = rebuildRouteAfterSkipChange(
      route,
      [near, far],
      baseFilters,
      context,
      [],
      true,
      origin,
    );
    assert.ok(rebuilt);
    assert.deepEqual(
      rebuilt!.stops.map((stop) => stop.house.id),
      ["near", "far"],
    );
  });
});

describe("rebuildRouteAfterFilterChange", () => {
  it("re-optimizes stop order when widening filters, not append-only", () => {
    const origin = { lat: 32.0919, lng: 34.8112 };
    const near = stub("near", { lat: 32.09195, lng: 34.81125, address: "חרוזים 8, חרוזים" });
    const far = stub("far", { lat: 32.094, lng: 34.818, address: "נחלת גנים 1, נחלת גנים" });
    const mid = stub("mid", { lat: 32.0925, lng: 34.814, address: "חרוזים 12, חרוזים" });
    const likedOnlyRoute = buildWalkingRouteOrdered([far], origin);
    const context = {
      houseSet: "real" as const,
      likedIds: ["far"],
      visitedIds: [],
      skippedIds: [],
      now: new Date("2026-10-31T18:00:00"),
    };
    const allFilters = { ...baseFilters, likedOnly: false };
    const rebuilt = rebuildRouteAfterFilterChange(
      likedOnlyRoute,
      [near, mid, far],
      allFilters,
      context,
      true,
      origin,
    );
    assert.ok(rebuilt);
    const ids = rebuilt!.stops.map((stop) => stop.house.id);
    assert.equal(ids.length, 3);
    assert.equal(ids[0], "near");
    assert.notEqual(ids.join(","), "far,near,mid");
  });
});

describe("diffRouteByFilters", () => {
  it("explains filter removals with a reason", () => {
    const closed = stub("a", { visit: "closed", soldOut: true });
    const open = stub("b");
    const route = buildWalkingRouteOrdered([closed, open], { lat: 32.0919, lng: 34.8112 });
    const context = {
      houseSet: "real" as const,
      likedIds: [],
      visitedIds: [],
      skippedIds: [],
      now: new Date("2026-10-31T18:00:00"),
    };
    const { removed } = diffRouteByFilters(route, [closed, open], {
      ...baseFilters,
      closedOnly: true,
    }, context);
    assert.equal(removed.length, 1);
    assert.equal(removed[0]?.name, "b");
    assert.equal(removed[0]?.reason, "לא סגור");
  });
});

describe("route change reasons", () => {
  it("labels skipped houses when removed", () => {
    const house = stub("a");
    const reason = whyRemovedFromRoute(house, baseFilters, {
      houseSet: "real",
      likedIds: [],
      visitedIds: [],
      skippedIds: ["a"],
      now: new Date("2026-10-31T18:00:00"),
    });
    assert.equal(reason, "דילגתם על הבית");
  });

  it("labels visited houses when removed", () => {
    const house = stub("a");
    const reason = whyRemovedFromRoute(house, baseFilters, {
      houseSet: "real",
      likedIds: [],
      visitedIds: ["a"],
      skippedIds: [],
      now: new Date("2026-10-31T18:00:00"),
    });
    assert.equal(reason, "כבר ביקרתם");
  });

  it("labels closed houses when removed", () => {
    const house = stub("a", { visit: "closed", soldOut: true });
    const reason = whyRemovedFromRoute(house, baseFilters, {
      houseSet: "real",
      likedIds: [],
      visitedIds: [],
      skippedIds: [],
      now: new Date("2026-10-31T18:00:00"),
    });
    assert.equal(reason, "נסגר");
  });

  it("labels reopened houses when added", () => {
    const previous = stub("a", { visit: "closed", soldOut: true });
    const next = stub("a", { visit: "come", soldOut: false });
    const reason = whyAddedToRoute(next, baseFilters, {
      houseSet: "real",
      likedIds: [],
      visitedIds: [],
      skippedIds: [],
      now: new Date("2026-10-31T18:00:00"),
    }, previous);
    assert.equal(reason, "חזר לפתוח");
  });

  it("omits generic filter-match reason when adding", () => {
    const house = stub("a", {
      openFrom: "20:00",
      openTo: "22:00",
      openHours: [{ from: "20:00", to: "22:00" }],
    });
    const reason = whyAddedToRoute(house, baseFilters, {
      houseSet: "real",
      likedIds: [],
      visitedIds: [],
      skippedIds: [],
      now: new Date("2026-10-31T18:00:00"),
    });
    assert.equal(reason, undefined);
  });
});
