import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collapseStreetPrefixDuplicates,
  looseStreetQueryMatch,
  rankAndFilterStreets,
} from "@/lib/event-boundary-street-search";

describe("event-boundary-street-search", () => {
  it("matches Abba Hillel with alternate spelling", () => {
    assert.equal(looseStreetQueryMatch("אבא הלל", "אבא הילל"), true);
  });

  it("filters unrelated streets", () => {
    const rows = rankAndFilterStreets(
      [
        { street: "אבא הלל", city: "רמת גן" },
        { street: "ביאליק", city: "רמת גן" },
        { street: "אבא הלל סילבר", city: "רמת גן" },
      ],
      "אבא הילל",
      10,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.street, "אבא הלל");
  });

  it("collapses silver suffix when shorter matches", () => {
    const out = collapseStreetPrefixDuplicates(
      [
        { street: "אבא הלל סילבר", city: "רמת גן" },
        { street: "אבא הלל", city: "רמת גן" },
      ],
      "אבא הלל",
    );
    assert.equal(out.length, 1);
    assert.equal(out[0]?.street, "אבא הלל");
  });
});
