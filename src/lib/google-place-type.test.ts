import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { primaryGooglePlaceType } from "@/lib/google-places.server";

describe("primaryGooglePlaceType", () => {
  it("prefers a specific type over establishment", () => {
    assert.equal(primaryGooglePlaceType(["establishment", "school", "point_of_interest"]), "school");
  });

  it("falls back to the first type", () => {
    assert.equal(primaryGooglePlaceType(["establishment", "point_of_interest"]), "establishment");
  });
});
