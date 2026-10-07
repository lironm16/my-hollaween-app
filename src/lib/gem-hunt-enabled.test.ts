import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gemHuntResidentialHousesEnabled } from "@/lib/gem-hunt-enabled";

describe("gem hunt enabled", () => {
  it("keeps residential gems off until event time", () => {
    assert.equal(gemHuntResidentialHousesEnabled(), false);
  });
});
