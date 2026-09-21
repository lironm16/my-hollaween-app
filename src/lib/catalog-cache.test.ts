import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { snapshotFreshEnough } from "@/lib/catalog-cache";

describe("catalog snapshot cache", () => {
  it("accepts snapshots at or after minUpdatedAt", () => {
    const snap = {
      updatedAt: "2026-09-21T10:00:00.000Z",
      houses: [],
      catalog: { updatedAt: "2026-09-21T10:00:00.000Z", neighborhood: "", houses: [] },
    };
    assert.equal(snapshotFreshEnough(snap, "2026-09-21T09:00:00.000Z"), true);
    assert.equal(snapshotFreshEnough(snap, "2026-09-21T10:00:00.000Z"), true);
    assert.equal(snapshotFreshEnough(snap, "2026-09-21T11:00:00.000Z"), false);
  });

  it("allows any snapshot when minUpdatedAt is omitted", () => {
    const snap = {
      updatedAt: "2026-09-21T10:00:00.000Z",
      houses: [],
      catalog: { updatedAt: "2026-09-21T10:00:00.000Z", neighborhood: "", houses: [] },
    };
    assert.equal(snapshotFreshEnough(snap), true);
  });
});
