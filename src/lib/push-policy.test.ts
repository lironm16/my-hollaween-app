import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { neighborhoodPushBroadcastAllowed } from "@/lib/push-policy";

const beforeNight = new Date(2026, 9, 30, 12, 0, 0);
const onNight = new Date(2026, 9, 31, 19, 0, 0);

describe("neighborhoodPushBroadcastAllowed", () => {
  it("allows new house only before event night", () => {
    assert.equal(neighborhoodPushBroadcastAllowed("houseAdded", beforeNight), true);
    assert.equal(neighborhoodPushBroadcastAllowed("houseAdded", onNight), false);
  });

  it("blocks house status kinds", () => {
    assert.equal(neighborhoodPushBroadcastAllowed("candyOut", beforeNight), false);
    assert.equal(neighborhoodPushBroadcastAllowed("closed", onNight), false);
    assert.equal(neighborhoodPushBroadcastAllowed("backFromBreak", beforeNight), false);
  });
});
