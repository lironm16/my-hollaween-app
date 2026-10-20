import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addEventBoundaryZone, zoneWithinSettlement } from "@/lib/event-boundary-selection";
import { zoneKeyCity, zoneKeyNeighborhood, zoneKeyStreet } from "@/lib/event-boundary";

describe("event-boundary-selection", () => {
  it("drops inner zones when a whole settlement is added", () => {
    const hood = {
      kind: "neighborhood" as const,
      id: zoneKeyNeighborhood("ramat-gan|gefen"),
      label: "הגפן",
      city: "רמת גן",
    };
    const city = {
      kind: "city" as const,
      id: zoneKeyCity("רמת גן"),
      label: "רמת גן",
      city: "רמת גן",
    };
    const withHood = addEventBoundaryZone([], hood);
    const next = addEventBoundaryZone(withHood, city);
    assert.equal(next.length, 1);
    assert.equal(next[0]?.kind, "city");
  });

  it("drops same-city streets when adding a neighborhood", () => {
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
    const next = addEventBoundaryZone([street], hood);
    assert.equal(next.length, 1);
    assert.equal(next[0]?.kind, "neighborhood");
  });

  it("drops settlement when adding a finer zone inside it", () => {
    const city = {
      kind: "city" as const,
      id: zoneKeyCity("רמת גן"),
      label: "רמת גן",
    };
    const street = {
      kind: "street" as const,
      id: zoneKeyStreet("רמת גן", "ביאליק"),
      label: "ביאליק",
      city: "רמת גן",
    };
    const next = addEventBoundaryZone([city], street);
    assert.equal(next.length, 1);
    assert.equal(next[0]?.kind, "street");
  });

  it("zoneWithinSettlement matches parent city on streets", () => {
    assert.equal(
      zoneWithinSettlement(
        { kind: "street", id: "s:x", label: "גפן", city: "רמת גן" },
        "רמת גן",
      ),
      true,
    );
  });
});
