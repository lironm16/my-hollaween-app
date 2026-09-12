import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  diffRouteByFilters,
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
    status: "approved",
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
});
