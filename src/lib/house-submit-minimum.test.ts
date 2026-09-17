import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { houseOfferMinimumMet } from "@/lib/house-submit-minimum";

describe("houseOfferMinimumMet", () => {
  it("requires decor or candy", () => {
    assert.equal(houseOfferMinimumMet("none", "none"), false);
    assert.equal(houseOfferMinimumMet("none", "out"), false);
    assert.equal(houseOfferMinimumMet("mild", "none"), true);
    assert.equal(houseOfferMinimumMet("none", "plenty"), true);
    assert.equal(houseOfferMinimumMet("none", "low"), true);
  });
});
