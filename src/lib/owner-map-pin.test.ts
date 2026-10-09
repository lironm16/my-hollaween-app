import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stripDisallowedOwnerPinPatch } from "@/lib/owner-map-pin";

describe("stripDisallowedOwnerPinPatch", () => {
  it("drops lat/lng for owners when address is unchanged", () => {
    const patch = stripDisallowedOwnerPinPatch(
      { address: "חרוזים 8" },
      { lat: 32.1, lng: 34.8, name: "x" },
      false,
    );
    assert.equal(patch.name, "x");
    assert.equal(patch.lat, undefined);
    assert.equal(patch.lng, undefined);
  });

  it("keeps lat/lng when address changes", () => {
    const patch = stripDisallowedOwnerPinPatch(
      { address: "חרוזים 8" },
      { address: "חרוזים 10", lat: 32.1, lng: 34.8 },
      false,
    );
    assert.equal(patch.lat, 32.1);
    assert.equal(patch.lng, 34.8);
  });

  it("allows admin pin edits", () => {
    const patch = stripDisallowedOwnerPinPatch(
      { address: "חרוזים 8" },
      { lat: 32.1, lng: 34.8 },
      true,
    );
    assert.equal(patch.lat, 32.1);
  });
});
