import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatAdminDisplayAddress, resolveNeighborhoodForAdmin } from "@/lib/admin-house-location";

describe("admin house location", () => {
  it("does not infer hood from pin when stored is null", () => {
    const lat = 32.0945618;
    const lng = 34.816518;
    assert.equal(
      resolveNeighborhoodForAdmin({ address: "הזמיר 8", lat, lng, neighborhood: null }),
      null,
    );
    assert.equal(
      formatAdminDisplayAddress({ address: "הזמיר 8", lat, lng, neighborhood: null }),
      "הזמיר 8",
    );
  });

  it("uses stored neighborhood for display line", () => {
    assert.equal(
      formatAdminDisplayAddress({
        address: "סטרומה 4",
        lat: 32.0899146,
        lng: 34.8047034,
        neighborhood: "נחלת גנים",
      }),
      "סטרומה 4, נחלת גנים",
    );
  });
});
