import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { config } from "@/lib/config";

/** Mirrors catalog-provider poll scheduling (OFF-06). */
function catalogPollMs(seconds?: number) {
  const n = seconds ?? config.catalogPollSeconds;
  return Math.max(30, n) * 1000;
}

describe("catalog poll interval", () => {
  it("OFF-06 uses configured poll seconds with a 30s floor", () => {
    assert.equal(catalogPollMs(5), 30_000);
    assert.equal(catalogPollMs(180), 180_000);
    assert.equal(catalogPollMs(), Math.max(30, config.catalogPollSeconds) * 1000);
  });
});
