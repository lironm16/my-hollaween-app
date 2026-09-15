import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aggregateActivityTotals, type ActivityFile } from "@/lib/activity-store";

describe("aggregateActivityTotals", () => {
  it("sums liked and visited counts across devices", () => {
    const file: ActivityFile = {
      updatedAt: "2026-01-01T00:00:00.000Z",
      devices: {
        aaaaaaaaaaaaaaaa: { liked: 3, visited: 5, at: 1 },
        bbbbbbbbbbbbbbbb: { liked: 2, visited: 1, at: 2 },
      },
    };
    const totals = aggregateActivityTotals(file);
    assert.equal(totals.totalLiked, 5);
    assert.equal(totals.totalVisited, 6);
    assert.equal(totals.devicesReporting, 2);
  });

  it("ignores negative counts", () => {
    const file: ActivityFile = {
      updatedAt: "2026-01-01T00:00:00.000Z",
      devices: {
        aaaaaaaaaaaaaaaa: { liked: -2, visited: 4, at: 1 },
      },
    };
    const totals = aggregateActivityTotals(file);
    assert.equal(totals.totalLiked, 0);
    assert.equal(totals.totalVisited, 4);
  });
});
