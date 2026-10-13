import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchNamedAddressPlaces } from "@/lib/named-address-places";

describe("named address places", () => {
  it("matches school names and aliases", () => {
    for (const q of ["ניצנים", "ביה״ס גבעולים", "בית ספר המנחיל"]) {
      const hits = searchNamedAddressPlaces(q);
      assert.ok(hits.length >= 1, q);
    }
  });
});
