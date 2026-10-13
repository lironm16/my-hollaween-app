import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gemBagMenuVisible,
  gemHuntResidentialHousesEnabled,
  gemHuntVisible,
  gemMapLegendVisible,
} from "@/lib/gem-hunt-enabled";

describe("gem hunt enabled", () => {
  it("keeps residential gems off until event time", () => {
    assert.equal(gemHuntResidentialHousesEnabled(), false);
  });

  it("defaults gem hunt UI to admin-only", () => {
    assert.equal(gemHuntVisible(false, false), false);
    assert.equal(gemHuntVisible(true, false), true);
    assert.equal(gemMapLegendVisible(false, false), false);
    assert.equal(gemBagMenuVisible(false, false), false);
  });

  it("opens gem hunt UI for visitors when gemHuntPublic is on", () => {
    assert.equal(gemHuntVisible(false, true), true);
    assert.equal(gemMapLegendVisible(false, true), true);
    assert.equal(gemBagMenuVisible(false, true), true);
  });
});
