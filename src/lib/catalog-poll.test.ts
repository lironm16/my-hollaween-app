import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { config } from "@/lib/config";
import { catalogPollMs } from "@/lib/catalog-poll";

describe("catalog poll interval", () => {
  it("OFF-06 uses configured poll seconds with a 30s floor", () => {
    assert.equal(catalogPollMs(5), 30_000);
    assert.equal(catalogPollMs(300), 300_000);
    assert.equal(catalogPollMs(), Math.max(30, config.catalogPollSeconds) * 1000);
  });
});
