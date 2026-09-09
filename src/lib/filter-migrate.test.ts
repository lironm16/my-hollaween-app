import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { migrateHouseFilters } from "@/lib/filter-migrate";
import { isKidsFriendlyFilter, isWithCandyFilter } from "@/lib/filter-presets";
import type { HouseFiltersState } from "@/lib/offline-db";
import { CANDY_TONE_IDS, SCARE_LEVELS } from "@/lib/types";

function base(): HouseFiltersState {
  return {
    accessibleOnly: false,
    openNowOnly: true,
    closingSoonOnly: true,
    openingSoonOnly: false,
    notYetOpenOnly: true,
    onBreakOnly: false,
    afterHoursOnly: true,
    visitWindowMode: "now",
    visitWindowFrom: "",
    visitWindowTo: "",
    closedOnly: true,
    decorOnlyOnly: true,
    sensitivityFilters: ["glutenFree"],
    scareFilters: ["medium"],
    candyFilters: ["plenty"],
    neighborhoodFilters: ["חרוזים"],
    likedOnly: true,
    unvisitedOnly: false,
    visitedOnly: true,
    includeUndecorated: false,
  };
}

describe("migrateHouseFilters", () => {
  it("clears legacy engine flags but keeps toolbar filters", () => {
    const next = migrateHouseFilters(base());
    assert.equal(next.openNowOnly, false);
    assert.equal(next.closedOnly, false);
    assert.equal(next.visitedOnly, false);
    assert.equal(next.unvisitedOnly, false);
    assert.equal(next.likedOnly, true);
  });

  it("normalizes partial candy and scare selections", () => {
    const next = migrateHouseFilters(base());
    assert.equal(isWithCandyFilter(next), false);
    assert.equal(isKidsFriendlyFilter(next), false);
    assert.deepEqual(next.candyFilters, CANDY_TONE_IDS);
    assert.deepEqual(next.scareFilters, SCARE_LEVELS);
    assert.equal(next.includeUndecorated, true);
    assert.deepEqual(next.sensitivityFilters, []);
  });
});
