import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gemTapCollectReady } from "@/lib/gem-hunt-tap-collect";

describe("gemTapCollectReady", () => {
  it("tell-me and cluster allow tap as soon as center gem is shown", () => {
    assert.equal(
      gemTapCollectReady({
        phase: "visible",
        gemAtCenter: true,
        centerReveal: true,
        campusSession: true,
        encounterMode: false,
        encounterPhase: "encounter",
        canCollectNow: true,
        simulate: false,
        pinCollectReady: false,
      }),
      true,
    );
  });
});
