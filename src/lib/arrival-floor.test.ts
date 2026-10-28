import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isHighFloorArrival, parseArrivalFloor } from "@/lib/arrival-floor";

describe("parseArrivalFloor", () => {
  it("reads Hebrew floor numbers", () => {
    assert.equal(parseArrivalFloor("קומה 2, דירה 5"), 2);
    assert.equal(parseArrivalFloor("דירה 7, קומה 4"), 4);
    assert.equal(parseArrivalFloor("קומה קרקע, דלת כתומה"), 0);
  });

  it("reads English floor numbers", () => {
    assert.equal(parseArrivalFloor("2nd floor, apt 4"), 2);
    assert.equal(parseArrivalFloor("floor 5"), 5);
  });

  it("flags high floors only from 4 upward", () => {
    assert.equal(isHighFloorArrival("קומה 3, דירה 8"), false);
    assert.equal(isHighFloorArrival("קומה 4, דירה 11"), true);
    assert.equal(isHighFloorArrival("קומה 7"), true);
    assert.equal(isHighFloorArrival("כניסה מהחצר"), false);
  });
});
