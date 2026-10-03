import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatAdminDisplayAddress, resolveNeighborhoodForAdmin } from "@/lib/admin-house-location";

describe("admin house location", () => {
  it("uses legacy inference for admin hood when stored is null", () => {
    const lat = 32.0945618;
    const lng = 34.816518;
    assert.equal(
      resolveNeighborhoodForAdmin({ address: "הזמיר 8", lat, lng, neighborhood: null }),
      "שיכון ותיקים",
    );
    assert.equal(
      formatAdminDisplayAddress({ address: "הזמיר 8", lat, lng, neighborhood: null }),
      "הזמיר 8, שיכון ותיקים",
    );
  });

  it("prefers Rokach street override", () => {
    assert.equal(
      resolveNeighborhoodForAdmin({
        address: "רוקח 32",
        lat: 32.09,
        lng: 34.81,
        neighborhood: null,
      }),
      "שיכון ותיקים",
    );
  });
});
