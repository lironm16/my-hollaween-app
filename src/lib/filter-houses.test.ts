import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterHouses } from "@/lib/filter-houses";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";

function baseFilters(overrides: Partial<HouseFiltersState> = {}): HouseFiltersState {
  return {
    accessibleOnly: false,
    openNowOnly: false,
    closingSoonOnly: false,
    openingSoonOnly: false,
    notYetOpenOnly: false,
    onBreakOnly: false,
    afterHoursOnly: false,
    visitWindowMode: "now",
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
    includeUndecorated: true,
    ...overrides,
  };
}

function house(id: string, patch: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id,
    name: `בית ${id}`,
    theme: "pumpkin",
    address: "חרוזים",
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
    notes: "",
    accessible: false,
    status: "approved",
    soldOut: false,
    adminFrozen: false,
    updatedAt: "2026-10-31T12:00:00.000Z",
    ...patch,
  } as PublicHouse;
}

const now = new Date(2026, 9, 31, 18, 30, 0, 0);

describe("filterHouses", () => {
  it("filters liked houses only", () => {
    const houses = [house("a"), house("b")];
    const result = filterHouses(houses, baseFilters({ likedOnly: true }), {
      houseSet: "real",
      likedIds: ["b"],
      visitedIds: [],
      now,
    });
    assert.deepEqual(result.map((item) => item.id), ["b"]);
  });

  it("filters unvisited houses only", () => {
    const houses = [house("a"), house("b")];
    const result = filterHouses(houses, baseFilters({ unvisitedOnly: true }), {
      houseSet: "real",
      likedIds: [],
      visitedIds: ["a"],
      now,
    });
    assert.deepEqual(result.map((item) => item.id), ["b"]);
  });

  it("filters to houses with candy stock when candy filter is restricted", () => {
    const houses = [
      house("a", { treatStock: { candy: "out" } }),
      house("b", { treatStock: { candy: "plenty" } }),
    ];
    const result = filterHouses(houses, baseFilters({ candyFilters: ["plenty", "low"] }), {
      houseSet: "real",
      likedIds: [],
      visitedIds: [],
      now,
    });
    assert.deepEqual(result.map((item) => item.id), ["b"]);
  });

  it("filters to houses open right now, not merely overlapping later hours", () => {
    const houses = [
      house("open", { openFrom: "17:00", openTo: "21:00", visit: "come" }),
      house("later", { openFrom: "19:00", openTo: "21:00", visit: "come" }),
      house("closed", { openFrom: "17:00", openTo: "21:00", visit: "closed" }),
    ];
    const result = filterHouses(houses, baseFilters({ visitWindowMode: "now" }), {
      houseSet: "real",
      likedIds: [],
      visitedIds: [],
      now,
    });
    assert.deepEqual(result.map((item) => item.id), ["open"]);
  });

  it("custom start-only and start+end use the same open-at-departure filter", () => {
    const houses = [
      house("open", { openFrom: "17:00", openTo: "21:00", visit: "come" }),
      house("later", { openFrom: "19:00", openTo: "21:00", visit: "come" }),
    ];
    const context = { houseSet: "real" as const, likedIds: [], visitedIds: [], now };
    const startOnly = filterHouses(
      houses,
      baseFilters({
        visitWindowMode: "custom",
        visitWindowUseFrom: true,
        visitWindowUseTo: false,
        visitWindowFrom: "18:30",
        visitWindowTo: "",
      }),
      context,
    );
    const startAndEnd = filterHouses(
      houses,
      baseFilters({
        visitWindowMode: "custom",
        visitWindowUseFrom: true,
        visitWindowUseTo: true,
        visitWindowFrom: "18:30",
        visitWindowTo: "20:00",
      }),
      context,
    );
    assert.deepEqual(startOnly.map((item) => item.id), ["open"]);
    assert.deepEqual(startAndEnd.map((item) => item.id), startOnly.map((item) => item.id));
  });
});
