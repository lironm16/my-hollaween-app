import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { preferExactStreetMatches } from "@/lib/event-boundary-nominatim.server";

describe("preferExactStreetMatches", () => {
  it("keeps only exact street name when query matches one of several prefixes", () => {
    const streets = [
      { street: "אבא הלל סילבר", city: "רמת גן", label: "אבא הלל סילבר, רמת גן" },
      { street: "אבא הלל", city: "רמת גן", label: "אבא הלל, רמת גן" },
    ];
    const out = preferExactStreetMatches(streets, "אבא הלל");
    assert.equal(out.length, 1);
    assert.equal(out[0].street, "אבא הלל");
  });

  it("keeps all when query is not an exact street name", () => {
    const streets = [
      { street: "אבא הלל סילבר", city: "רמת גן", label: "" },
      { street: "אבא הלל", city: "רמת גן", label: "" },
    ];
    const out = preferExactStreetMatches(streets, "אבא הל");
    assert.equal(out.length, 2);
  });
});
