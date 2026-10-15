import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterHouses } from "@/lib/filter-houses";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";
import { buildWalkingRouteOrdered } from "@/lib/route";
import { captureRouteDisplayOrders } from "@/lib/route-display-order";
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
  it("omits off-route visited houses from the route list", () => {
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

    assert.equal(items.some((item) => item.house.id === "b"), false);
    assert.deepEqual(
      items.map((item) => item.house.id),
      ["a", "c"],
    );
  });

  it("keeps pinned stop numbers after a visit rebuild compacts orders", () => {
    const houses = [
      stub("a", { lat: 32.091, lng: 34.801 }),
      stub("b", { lat: 32.092, lng: 34.802 }),
      stub("c", { lat: 32.093, lng: 34.803 }),
    ];
    const full = buildWalkingRouteOrdered(houses, { lat: 32.09, lng: 34.81 });
    assert.ok(full);
    const session = captureRouteDisplayOrders(full);
    const afterVisit = buildWalkingRouteOrdered([houses[1]!, houses[2]!], { lat: 32.09, lng: 34.81 });
    assert.ok(afterVisit);

    const items = buildRouteListItems({
      route: afterVisit,
      catalogHouses: houses,
      houseSet: "real",
      visitedIds: ["a"],
      skippedIds: [],
      origin: { lat: 32.09, lng: 34.81 },
      distanceLabel: () => "hop",
      distanceAllowed: () => true,
      sessionDisplayOrders: session,
    });

    assert.deepEqual(
      items.map((item) => item.order),
      [2, 3],
    );
    assert.equal(items.some((item) => item.house.id === "a"), false);
  });

  it("omits hop labels before address reveal but keeps leg slots empty", () => {
    const houses = [stub("a"), stub("b")];
    const route = buildWalkingRouteOrdered([houses[0]!, houses[1]!], { lat: 32.09, lng: 34.81 });
    assert.ok(route);

    const items = buildRouteListItems({
      route,
      catalogHouses: houses,
      houseSet: "real",
      visitedIds: [],
      skippedIds: [],
      origin: { lat: 32.09, lng: 34.81 },
      distanceLabel: (_id, m) => `${m}m`,
      distanceAllowed: () => false,
    });

    assert.equal(items.length, 2);
    assert.equal(items[0]!.hop, "");
    assert.equal(items[1]!.hop, "");
  });

  it("shows an empty route list when active stops are cleared after completion", () => {
    const houses = [stub("a"), stub("b")];
    const emptyRoute = buildWalkingRouteOrdered([], { lat: 32.09, lng: 34.81 });
    assert.equal(emptyRoute, null);
    const completedRoute = {
      stops: [],
      totalMeters: 0,
      totalMinutes: 0,
      startedFrom: "neighborhood" as const,
      origin: { lat: 32.09, lng: 34.81 },
      accessible: false,
    };
    const items = buildRouteListItems({
      route: completedRoute,
      catalogHouses: houses,
      houseSet: "real",
      visitedIds: ["a", "b"],
      skippedIds: [],
      origin: { lat: 32.09, lng: 34.81 },
      distanceLabel: () => "hop",
      distanceAllowed: () => true,
    });
    assert.equal(items.length, 0);
  });

  it("collapses in-order visited stops on the plan with green legs", () => {
    const houses = [
      stub("a", { lat: 32.091, lng: 34.801 }),
      stub("b", { lat: 32.092, lng: 34.802 }),
      stub("c", { lat: 32.093, lng: 34.803 }),
    ];
    const route = buildWalkingRouteOrdered(houses, { lat: 32.09, lng: 34.81 });
    assert.ok(route);

    const items = buildRouteListItems({
      route,
      catalogHouses: houses,
      houseSet: "real",
      visitedIds: ["a"],
      skippedIds: [],
      origin: { lat: 32.09, lng: 34.81 },
      distanceLabel: () => "hop",
      distanceAllowed: () => true,
    });

    const a = items.find((item) => item.house.id === "a");
    const b = items.find((item) => item.house.id === "b");
    assert.ok(a?.doneCollapsed);
    assert.equal(a?.legDone, true);
    assert.equal(b?.legDone, false);

    const outOfOrder = buildRouteListItems({
      route,
      catalogHouses: houses,
      houseSet: "real",
      visitedIds: ["c"],
      skippedIds: [],
      origin: { lat: 32.09, lng: 34.81 },
      distanceLabel: () => "hop",
      distanceAllowed: () => true,
    });
    const cOnly = outOfOrder.find((item) => item.house.id === "c");
    assert.ok(cOnly?.doneCollapsed);
    assert.equal(cOnly?.legDone, true);
  });

  it("uses gray legs onto skipped houses", () => {
    const houses = [stub("a"), stub("b")];
    const route = buildWalkingRouteOrdered(houses, { lat: 32.09, lng: 34.81 });
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
    const b = items.find((item) => item.house.id === "b");
    assert.equal(b?.legTone, "skipped");
  });

  it("omits off-route skipped houses from the route list", () => {
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

    assert.equal(items.length, 1);
    assert.equal(items[0]!.house.id, "a");
  });
});
