import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePointAddressQuery } from "@/lib/event-boundary-address-parse";

describe("parsePointAddressQuery", () => {
  it("parses street number city in Hebrew", () => {
    const p = parsePointAddressQuery("נחליאלי 4 רמת גן");
    assert.deepEqual(p, { houseNumber: "4", street: "נחליאלי", city: "רמת גן" });
  });

  it("parses comma-separated address", () => {
    const p = parsePointAddressQuery("אבא הלל סילבר 14, רמת גן");
    assert.equal(p?.houseNumber, "14");
    assert.equal(p?.street, "אבא הלל סילבר");
    assert.equal(p?.city, "רמת גן");
  });
});
