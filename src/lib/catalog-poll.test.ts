import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { config } from "@/lib/config";
import {
  adaptiveCatalogPollMs,
  catalogPollMs,
  effectiveCatalogPollSeconds,
} from "@/lib/catalog-poll";

describe("catalog poll interval", () => {
  it("OFF-06 uses configured poll seconds with a 30s floor", () => {
    assert.equal(catalogPollMs(5), 30_000);
    assert.equal(catalogPollMs(300), 300_000);
    assert.equal(catalogPollMs(), Math.max(30, config.catalogPollSeconds) * 1000);
  });

  it("uses a longer interval overnight", () => {
    const night = new Date("2026-10-30T23:00:00");
    const day = new Date("2026-10-30T12:00:00");
    assert.equal(effectiveCatalogPollSeconds(night), Math.max(config.catalogPollSeconds, 600));
    assert.equal(effectiveCatalogPollSeconds(day), config.catalogPollSeconds);
  });

  it("stretches adaptive polling after empty deltas", () => {
    assert.equal(adaptiveCatalogPollMs(300, 0), 300_000);
    assert.equal(adaptiveCatalogPollMs(300, 3), 450_000);
    assert.equal(adaptiveCatalogPollMs(300, 6), 600_000);
  });
});
