import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countSkippedInSet, isStubHouse } from "@/lib/house-set";

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
