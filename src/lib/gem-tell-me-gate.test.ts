import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gemTellMeHuntRadiusEnforced, gemTellMeInRange } from "@/lib/gem-tell-me-gate";
import type { PublicHouse } from "@/lib/types";

const house = {
  id: "h1",
  lat: 32.09,
  lng: 34.81,
} as PublicHouse;

describe("gemTellMeHuntRadiusEnforced", () => {
  it("always enforces for non-admins", () => {
    assert.equal(gemTellMeHuntRadiusEnforced(false, false), true);
    assert.equal(gemTellMeHuntRadiusEnforced(false, true), true);
  });

  it("admins skip enforcement unless preview-as-user is on", () => {
    assert.equal(gemTellMeHuntRadiusEnforced(true, false), false);
    assert.equal(gemTellMeHuntRadiusEnforced(true, true), true);
  });
});

describe("gemTellMeInRange", () => {
  it("honors simulate in range", () => {
    assert.equal(gemTellMeInRange(null, house, true), true);
  });
});
