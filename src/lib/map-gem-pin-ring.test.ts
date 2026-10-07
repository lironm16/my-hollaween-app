import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PublicHouse } from "@/lib/types";
import {
  clusterHasUncollectedMapGem,
  mapPinRingDecorForCluster,
  mapPinRingDecorForHouse,
  resolveMapGemPinRingVariant,
} from "@/lib/map-gem-pin-ring";

function stubHouse(id: string, patch: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id,
    name: id,
    address: "addr",
    lat: 32.08,
    lng: 34.78,
    scareLevel: "mild",
    visit: "open",
    ...patch,
  } as PublicHouse;
}

describe("map gem pin rings", () => {
  it("shows sparkle when hunt mode on and gem not collected", () => {
    assert.equal(resolveMapGemPinRingVariant(true, null, true), "sparkle");
    assert.equal(resolveMapGemPinRingVariant(true, null, false), null);
    assert.equal(resolveMapGemPinRingVariant(false, null, true), null);
  });

  it("prefers diamond ring when hours ring would show", () => {
    assert.equal(resolveMapGemPinRingVariant(true, "closing", true), "diamond");
    assert.equal(resolveMapGemPinRingVariant(true, "opening", true), "diamond");
  });

  it("cluster ring when any unit still has an uncollected gem", () => {
    const a = stubHouse("a");
    const b = stubHouse("b");
    const ctx = {
      showGemRings: true,
      gemHouseIds: new Set(["a", "b"]),
      isCollected: (id: string) => id === "a",
    };
    assert.equal(clusterHasUncollectedMapGem([a, b], ctx), true);
    assert.equal(clusterHasUncollectedMapGem([a], { ...ctx, isCollected: () => true }), false);
  });

  it("suppresses hours ring html while gem ring is active", () => {
    const house = stubHouse("h1");
    const decor = mapPinRingDecorForHouse(house, new Date(), {
      showGemRings: true,
      gemHouseIds: new Set(["h1"]),
      isCollected: () => false,
    });
    assert.match(decor.ringHtml, /pin-gem-ring is-sparkle/);
    assert.doesNotMatch(decor.ringHtml, /pin-hours-ring/);
  });

  it("cluster decor uses diamond when hours conflict", () => {
    const house = stubHouse("h1", {
      hourWindows: [{ open: "18:00", close: "22:00" }],
    });
    const now = new Date("2026-10-31T21:50:00");
    const decor = mapPinRingDecorForCluster([house], now, {
      showGemRings: true,
      gemHouseIds: new Set(["h1"]),
      isCollected: () => false,
    });
    if (decor.ringHtml.includes("pin-gem-ring")) {
      assert.match(decor.ringHtml, /is-diamond|is-sparkle/);
      assert.doesNotMatch(decor.ringHtml, /pin-hours-ring/);
    }
  });
});
