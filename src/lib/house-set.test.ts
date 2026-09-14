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
});
