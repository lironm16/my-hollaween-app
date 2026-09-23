import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adaptiveCatalogPollMs,
  catalogPollMs,
  effectiveCatalogPollSeconds,
  readCatalogPollSeconds,
} from "@/lib/catalog-poll";

describe("catalog poll interval", () => {
  it("OFF-06 uses configured poll seconds with a 30s floor", () => {
    assert.equal(catalogPollMs(5), 30_000);
    assert.equal(catalogPollMs(300), 300_000);
    assert.equal(catalogPollMs(), readCatalogPollSeconds() * 1000);
  });

  it("reads CATALOG_POLL_SECONDS from env at call time", () => {
    const prev = process.env.CATALOG_POLL_SECONDS;
    process.env.CATALOG_POLL_SECONDS = "120";
    try {
      assert.equal(readCatalogPollSeconds(), 120);
      assert.equal(effectiveCatalogPollSeconds(new Date("2026-10-30T12:00:00")), 120);
    } finally {
      if (prev === undefined) delete process.env.CATALOG_POLL_SECONDS;
      else process.env.CATALOG_POLL_SECONDS = prev;
    }
  });

  it("uses a longer interval overnight", () => {
    const base = readCatalogPollSeconds();
    const night = new Date("2026-10-30T23:00:00");
    const day = new Date("2026-10-30T12:00:00");
    assert.equal(effectiveCatalogPollSeconds(night), Math.max(base, 600));
    assert.equal(effectiveCatalogPollSeconds(day), base);
  });

  it("stretches adaptive polling after empty deltas", () => {
    assert.equal(adaptiveCatalogPollMs(300, 0), 300_000);
    assert.equal(adaptiveCatalogPollMs(300, 3), 450_000);
    assert.equal(adaptiveCatalogPollMs(300, 6), 600_000);
  });
});
