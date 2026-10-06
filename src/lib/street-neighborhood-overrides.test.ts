import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  neighborhoodOverrideForStreetAddress,
  streetAddressLookupKey,
} from "@/lib/street-neighborhood-overrides";

describe("street neighborhood overrides", () => {
  it("maps Rokach 32 and 34 to שיכון ותיקים", () => {
    assert.equal(streetAddressLookupKey("רוקח 32"), "רוקח 32");
    assert.equal(streetAddressLookupKey("רוקח 34"), "רוקח 34");
    assert.equal(streetAddressLookupKey("רוקח 32, רמת גן"), "רוקח 32");
    assert.equal(neighborhoodOverrideForStreetAddress("רוקח 32"), "שיכון ותיקים");
    assert.equal(neighborhoodOverrideForStreetAddress("רוקח 34"), "שיכון ותיקים");
  });
});
