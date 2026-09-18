import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

describe("activity totals (file storage)", () => {
  let dataDir = "";

  beforeEach(async () => {
    dataDir = mkdtempSync(join(tmpdir(), "hw-activity-"));
    process.env.DATA_DIR = dataDir;
    const mod = await import("@/lib/activity-totals");
    mod.resetActivityTotalsCacheForTests();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("starts at zero and applies debounced deltas", async () => {
    const mod = await import("@/lib/activity-totals");
    const empty = await mod.readActivityTotals();
    assert.equal(empty.likedTotal, 0);
    assert.equal(empty.visitedTotal, 0);

    const bumped = await mod.applyActivityDelta({ likedDelta: 2, visitedDelta: 3 });
    assert.equal(bumped.likedTotal, 2);
    assert.equal(bumped.visitedTotal, 3);

    const again = await mod.readActivityTotals();
    assert.equal(again.likedTotal, 2);
    assert.equal(again.visitedTotal, 3);
  });

  it("ignores zero and out-of-range deltas", async () => {
    const mod = await import("@/lib/activity-totals");
    await mod.applyActivityDelta({ likedDelta: 1, visitedDelta: 0 });
    const same = await mod.applyActivityDelta({ likedDelta: 0, visitedDelta: 0 });
    assert.equal(same.likedTotal, 1);

    await mod.applyActivityDelta({ likedDelta: 999, visitedDelta: -999 });
    const clamped = await mod.readActivityTotals();
    assert.equal(clamped.likedTotal, 81);
    assert.equal(clamped.visitedTotal, 0);
  });
});
