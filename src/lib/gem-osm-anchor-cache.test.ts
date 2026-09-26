import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getOsmGemAnchor,
  osmGemAnchorCount,
  __resetGemOsmAnchorsForTests,
} from "@/lib/gem-osm-anchor-cache";

describe("gem osm anchor cache", () => {
  it("loads bundled anchor file", () => {
    assert.ok(osmGemAnchorCount() >= 0);
    const missing = getOsmGemAnchor("__no_such_house__");
    assert.equal(missing, null);
  });
});
