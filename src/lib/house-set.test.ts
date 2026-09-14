import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countSkippedInSet, isStubHouse, mergeMissingRehearsalStubs } from "@/lib/house-set";

describe("countSkippedInSet", () => {
  it("ignores rehearsal stubs when counting skips in real mode", () => {
    const houses = [
      { id: "real-1", description: "בית אמיתי" },
      { id: "בית-9310", description: "סטאב לחזרה — נפתח בקרוב." },
    ];
    assert.equal(isStubHouse(houses[1]!), true);
    assert.equal(
      countSkippedInSet(["real-1", "בית-9310"], houses, "real"),
      1,
    );
    assert.equal(
      countSkippedInSet(["real-1", "בית-9310"], houses, "stubs"),
      1,
    );
    assert.equal(
      countSkippedInSet(["real-1", "בית-9310"], houses, "all"),
      2,
    );
  });

  it("counts stub skips in stubs mode from catalog-only lookup rows", () => {
    const catalogStub = {
      id: "בית-1847",
      description: "סטאב לחזרה — דלעות על המדרגה.",
    };
    assert.equal(
      countSkippedInSet(["בית-1847"], [catalogStub], "stubs"),
      1,
    );
    assert.equal(
      countSkippedInSet(["בית-1847"], [], "stubs"),
      0,
    );
  });

  it("counts rehearsal stub ids in stubs mode even without a house row", () => {
    assert.equal(countSkippedInSet(["בית-9310"], [], "stubs"), 1);
  });
});

describe("mergeMissingRehearsalStubs", () => {
  it("adds missing seed rehearsal stubs without touching live houses", () => {
    const live = [{ id: "בית-9310", name: "live" }];
    const seed = [
      { id: "בית-9310", name: "seed" },
      { id: "בית-9318", name: "long title stub" },
      { id: "בית-9316", name: "dropped" },
      { id: "בית-1847", name: "general stub" },
    ];
    const merged = mergeMissingRehearsalStubs(live, seed);
    assert.equal(merged.length, 2);
    assert.equal(merged.find((house) => house.id === "בית-9310")?.name, "live");
    assert.equal(merged.find((house) => house.id === "בית-9318")?.name, "long title stub");
  });
});
