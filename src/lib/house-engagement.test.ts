import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateEngagementEvents,
  applyEngagementDelta,
  clampEngagementDelta,
  normalizeEngagementCounts,
} from "@/lib/house-engagement";

describe("house-engagement", () => {
  it("clamps deltas to ±1", () => {
    assert.equal(clampEngagementDelta(3), 1);
    assert.equal(clampEngagementDelta(-2), -1);
    assert.equal(clampEngagementDelta(0), 0);
  });

  it("aggregates events per house", () => {
    const map = aggregateEngagementEvents([
      { houseId: "a", kind: "like", delta: 1 },
      { houseId: "a", kind: "like", delta: -1 },
      { houseId: "b", kind: "visit", delta: 1 },
    ]);
    assert.equal(map.get("a")?.like, 0);
    assert.equal(map.get("b")?.visit, 1);
  });

  it("floors counts at zero", () => {
    const next = applyEngagementDelta({ likeCount: 2, visitCount: 1 }, { like: -5, visit: 0 });
    assert.deepEqual(next, normalizeEngagementCounts({ likeCount: 0, visitCount: 1 }));
  });
});
