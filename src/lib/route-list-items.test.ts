import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterHouses } from "@/lib/filter-houses";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";
import { buildWalkingRouteOrdered } from "@/lib/route";
import { buildRouteListItems } from "@/lib/route-list-items";

function stub(id: string, overrides: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id,
    name: id,
    theme: "pumpkin",
    address: `addr ${id}`,
    neighborhood: "חרוזים",
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

const baseFilters = (): HouseFiltersState => ({
  accessibleOnly: false,
  openNowOnly: false,
  closingSoonOnly: false,
  openingSoonOnly: false,
  notYetOpenOnly: false,
  onBreakOnly: false,
  afterHoursOnly: false,
  closedOnly: false,
  decorOnlyOnly: false,
  sensitivityFilters: [],
  scareFilters: [],
  candyFilters: [],
  neighborhoodFilters: [],
  likedOnly: false,
  unvisitedOnly: false,
  visitedOnly: false,
  skippedOnly: false,
  uncollectedGemOnly: false,
  includeUndecorated: true,
  locationKindFilter: "all",
  visitWindowFrom: "",
  visitWindowTo: "",
  visitWindowMode: "all",
});

describe("buildRouteListItems", () => {
  it("includes visited tail houses even when unvisitedOnly filter hides them from the list", () => {
    const houses = [stub("a"), stub("b"), stub("c")];
    const route = buildWalkingRouteOrdered([houses[0]!, houses[2]!], { lat: 32.09, lng: 34.81 });
    assert.ok(route);

    const filters = baseFilters();
    filters.unvisitedOnly = true;
    const now = new Date("2026-10-31T18:00:00.000Z");
    const context = {
      houseSet: "real" as const,
      likedIds: [] as string[],
      visitedIds: ["b"],
      skippedIds: [] as string[],
      now,
    };
    const visible = filterHouses(houses, filters, context);
    assert.equal(visible.some((house) => house.id === "b"), false);

    const items = buildRouteListItems({
      route,
      catalogHouses: houses,
      houseSet: "real",
      visitedIds: ["b"],
      skippedIds: [],
      origin: { lat: 32.09, lng: 34.81 },
      distanceLabel: (_id, m) => `${m}m`,
      distanceAllowed: () => true,
    });

    const visitedTail = items.filter((item) => item.visitedTail);
    assert.equal(visitedTail.length, 1);
    assert.equal(visitedTail[0]!.house.id, "b");
  });

  it("includes skipped tail houses not on the route", () => {
    const houses = [stub("a"), stub("b")];
    const route = buildWalkingRouteOrdered([houses[0]!], { lat: 32.09, lng: 34.81 });
    assert.ok(route);

    const items = buildRouteListItems({
      route,
      catalogHouses: houses,
      houseSet: "real",
      visitedIds: [],
      skippedIds: ["b"],
      origin: { lat: 32.09, lng: 34.81 },
      distanceLabel: () => "hop",
      distanceAllowed: () => true,
    });

    const skippedTail = items.filter((item) => item.skipped);
    assert.equal(skippedTail.length, 1);
    assert.equal(skippedTail[0]!.house.id, "b");
  });
});
