import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  revealRouteLineSlice,
  sliceRouteLineToStop,
  travelLineToStop,
  withApproachPrefix,
} from "@/lib/route-line";

const line = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 0.001 },
  { lat: 0, lng: 0.002 },
  { lat: 0, lng: 0.003 },
];

const stops = [
  { lat: 0, lng: 0.0015 },
  { lat: 0, lng: 0.003 },
];

describe("sliceRouteLineToStop", () => {
  it("returns empty for negative index", () => {
    assert.deepEqual(sliceRouteLineToStop(line, stops, -1), []);
  });

  it("slices to closest point on line for a stop", () => {
    const slice = sliceRouteLineToStop(line, stops, 0);
    assert.ok(slice.length > 1);
    assert.deepEqual(slice.at(-1), line[1]);
  });
});

describe("withApproachPrefix", () => {
  it("prepends origin when the street line does not already start there", () => {
    const origin = { lat: 0, lng: -0.00025 };
    const firstStop = { lat: 0, lng: 0.0015 };
    const prefixed = withApproachPrefix(line, origin, firstStop, 200);
    assert.deepEqual(prefixed[0], origin);
    assert.equal(prefixed.length, line.length + 1);
  });
});

describe("travelLineToStop", () => {
  it("includes approach on the first stop only", () => {
    const origin = { lat: 0, lng: -0.00025 };
    const firstLeg = travelLineToStop(line, stops, 0, origin);
    assert.deepEqual(firstLeg[0], origin);
    const secondLeg = travelLineToStop(line, stops, 1, origin);
    assert.notDeepEqual(secondLeg[0], origin);
  });
});

describe("revealRouteLineSlice", () => {
  it("returns full line at progress 1", () => {
    assert.deepEqual(revealRouteLineSlice(line, 1), line);
  });

  it("returns partial line at progress 0.5", () => {
    const partial = revealRouteLineSlice(line, 0.5);
    assert.ok(partial.length > 1);
    assert.ok(partial.length < line.length);
  });
});
