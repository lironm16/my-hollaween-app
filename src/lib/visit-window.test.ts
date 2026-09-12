import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultVisitWindowEnd,
  defaultVisitWindowEndFromStart,
  formatClockFromDate,
  resolveVisitWindow,
} from "@/lib/visit-window";
import type { HouseFiltersState } from "@/lib/offline-db";

function at(hours: number, minutes: number) {
  return new Date(2026, 9, 31, hours, minutes, 0, 0);
}

describe("defaultVisitWindowEnd", () => {
  it("uses 20:00 before eight pm", () => {
    assert.equal(defaultVisitWindowEnd(at(18, 45)), "20:00");
  });

  it("extends late starts up to 23:00", () => {
    assert.equal(defaultVisitWindowEnd(at(21, 30)), "23:00");
    assert.equal(defaultVisitWindowEnd(at(22, 30)), "23:00");
  });
});

describe("defaultVisitWindowEndFromStart", () => {
  it("uses 20:00 for an early start clock", () => {
    assert.equal(defaultVisitWindowEndFromStart("18:30"), "20:00");
  });

  it("extends a late start clock up to 23:00", () => {
    assert.equal(defaultVisitWindowEndFromStart("21:15"), "22:45");
    assert.equal(defaultVisitWindowEndFromStart("22:30"), "23:00");
  });
});

describe("resolveVisitWindow", () => {
  it("resolves now mode from the clock", () => {
    const now = at(19, 15);
    const filters: HouseFiltersState = {
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
      neighborhoodFilters: [],
      likedOnly: false,
      unvisitedOnly: false,
      visitedOnly: false,
      skippedOnly: false,
      includeUndecorated: true,
    };
    const resolved = resolveVisitWindow(filters, now);
    assert.equal(resolved.from, formatClockFromDate(now));
    assert.equal(resolved.to, "20:00");
  });
});
