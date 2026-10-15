import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PublicHouse } from "@/lib/types";
import { mapGemNearSignalActive } from "@/lib/map-gem-near-signal";

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

  it("is true within hunt range for a visible uncollected gem", () => {
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
});
