import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addEventBoundaryZone } from "@/lib/event-boundary-selection";
import { zoneKeyCity, zoneKeyNeighborhood, zoneKeyStreet } from "@/lib/event-boundary";

describe("event-boundary-selection", () => {
  it("appends zones without auto-removing overlaps", () => {
    const street = {
      kind: "street" as const,
      id: zoneKeyStreet("רמת גן", "חרוזים"),
      label: "חרוזים",
      city: "רמת גן",
    };
    const hood = {
      kind: "neighborhood" as const,
      id: zoneKeyNeighborhood("ramat-gan|charuzim"),
      label: "חרוזים",
      city: "רמת גן",
    };
    const city = {
      kind: "city" as const,
      id: zoneKeyCity("רמת גן"),
      label: "רמת גן",
    };
    let next = addEventBoundaryZone([], street);
    next = addEventBoundaryZone(next, hood);
    next = addEventBoundaryZone(next, city);
    assert.equal(next.length, 3);
  });

  it("skips duplicate ids", () => {
    const hood = {
      kind: "neighborhood" as const,
      id: zoneKeyNeighborhood("a"),
      label: "א",
      city: "רמת גן",
    };
    const once = addEventBoundaryZone([], hood);
    const twice = addEventBoundaryZone(once, hood);
    assert.equal(twice.length, 1);
  });
});
