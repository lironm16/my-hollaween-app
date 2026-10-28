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
    assert.equal(resolveMapGemPinRingVariant(true, true), "sparkle");
    assert.equal(resolveMapGemPinRingVariant(true, false), null);
    assert.equal(resolveMapGemPinRingVariant(false, true), null);
  });

  it("shows sparkle when near even if pin rings toggle is off", () => {
    assert.equal(resolveMapGemPinRingVariant(true, false, true), "sparkle");
    assert.equal(resolveMapGemPinRingVariant(true, false, false), null);
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

  it("uses gem ring html when hunt mode on", () => {
    const house = stubHouse("h1");
    const decor = mapPinRingDecorForHouse(house, new Date(), {
      showGemRings: true,
      gemHouseIds: new Set(["h1"]),
      isCollected: () => false,
    });
    assert.match(decor.ringHtml, /pin-gem-ring is-sparkle/);
    assert.match(decor.ringHtml, /pin-gem-sparkles/);
  });

  it("cluster decor uses gem ring when hunt mode on", () => {
    const house = stubHouse("h1", {
      openHours: [{ from: "18:00", to: "22:00" }],
    });
    const decor = mapPinRingDecorForCluster([house], new Date("2026-10-31T21:50:00"), {
      showGemRings: true,
      gemHouseIds: new Set(["h1"]),
      isCollected: () => false,
    });
    assert.match(decor.ringHtml, /pin-gem-ring is-sparkle/);
  });
});
