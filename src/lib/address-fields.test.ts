import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeAddressFields,
  splitLegacyAddress,
  streetFromLegacyAddress,
} from "@/lib/address-fields";
import { formatDisplayAddress, formatMapsAddress } from "@/lib/config";

describe("address fields", () => {
  it("splits legacy combined addresses", () => {
    const split = splitLegacyAddress("יהודית 15, חרוזים", 32.089223, 34.804374);
    assert.equal(split.street, "יהודית 15");
    assert.equal(split.neighborhood, "חרוזים");
  });

  it("keeps already-split storage", () => {
    const fields = normalizeAddressFields({
      address: "יהודית 15",
      neighborhood: "חרוזים",
      lat: 32.089223,
      lng: 34.804374,
    });
    assert.equal(fields.address, "יהודית 15");
    assert.equal(fields.neighborhood, "חרוזים");
  });

  it("joins street and neighborhood only for display", () => {
    const house = { address: "יהודית 15", neighborhood: "חרוזים" as const };
    assert.equal(formatDisplayAddress(house), "יהודית 15, חרוזים");
    assert.equal(formatMapsAddress(house), "יהודית 15, רמת גן");
  });

  it("strips neighborhood suffix from legacy street field on normalize", () => {
    const fields = normalizeAddressFields({
      address: "חרוזים 8, חרוזים",
      lat: 32.0916477,
      lng: 34.8028691,
    });
    assert.equal(fields.address, "חרוזים 8");
    assert.equal(fields.neighborhood, "חרוזים");
    assert.equal(streetFromLegacyAddress("חרוזים 8, חרוזים"), "חרוזים 8");
  });
});
