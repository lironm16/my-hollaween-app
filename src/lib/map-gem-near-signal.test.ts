import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PublicHouse } from "@/lib/types";
import {
  MAP_GEM_NEAR_GPS_HIGHLIGHT_ENABLED,
  mapGemNearHouseIds,
  mapGemNearSignalActive,
} from "@/lib/map-gem-near-signal";

function stub(id: string, lat: number, lng: number): PublicHouse {
  return { id, name: id, lat, lng } as PublicHouse;
}

describe("mapGemNearSignalActive", () => {
  it("is false when user is far or house is filtered out", () => {
    const house = stub("a", 32.0919, 34.8112);
    const user = { lat: 32.08, lng: 34.8 };
    assert.equal(
      mapGemNearSignalActive(user, [house], new Set(["a"]), () => false),
      false,
    );
    assert.equal(
      mapGemNearSignalActive(
        { lat: 32.09191, lng: 34.81121 },
        [house],
        new Set<string>(),
        () => false,
      ),
      false,
    );
  });

  it("is true within hunt range for a visible uncollected gem", { skip: !MAP_GEM_NEAR_GPS_HIGHLIGHT_ENABLED }, () => {
    const house = stub("a", 32.0919, 34.8112);
    assert.equal(
      mapGemNearSignalActive(
        { lat: 32.09191, lng: 34.81121 },
        [house],
        new Set(["a"]),
        () => false,
      ),
      true,
    );
  });

  it("mapGemNearHouseIds lists houses in hunt range", { skip: !MAP_GEM_NEAR_GPS_HIGHLIGHT_ENABLED }, () => {
    const house = stub("a", 32.0919, 34.8112);
    const ids = mapGemNearHouseIds(
      { lat: 32.09191, lng: 34.81121 },
      [house],
      new Set(["a"]),
      () => false,
    );
    assert.equal(ids.has("a"), true);
  });

  it("skips GPS scan when near highlight is disabled", () => {
    if (MAP_GEM_NEAR_GPS_HIGHLIGHT_ENABLED) return;
    const house = stub("a", 32.0919, 34.8112);
    const ids = mapGemNearHouseIds(
      { lat: 32.09191, lng: 34.81121 },
      [house],
      new Set(["a"]),
      () => false,
    );
    assert.equal(ids.size, 0);
    assert.equal(
      mapGemNearSignalActive(
        { lat: 32.09191, lng: 34.81121 },
        [house],
        new Set(["a"]),
        () => false,
      ),
      false,
    );
  });
});
