import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gemTapCollectReady } from "@/lib/gem-hunt-tap-collect";

describe("gemTapCollectReady", () => {
  it("cluster/tell-me requires arm delay before tap", () => {
    assert.equal(
      gemTapCollectReady({
        phase: "visible",
        gemAtCenter: true,
        tellMeCollectArmed: false,
        centerReveal: true,
        campusSession: true,
        encounterMode: false,
        encounterPhase: "encounter",
        canCollectNow: true,
        simulate: false,
        pinCollectReady: false,
      }),
      false,
    );
    assert.equal(
      gemTapCollectReady({
        phase: "visible",
        gemAtCenter: true,
        tellMeCollectArmed: true,
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
