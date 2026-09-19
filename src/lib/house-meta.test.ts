import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { houseAddedMetaLine } from "@/lib/house-meta";

describe("houseAddedMetaLine", () => {
  it("combines who and when", () => {
    const line = houseAddedMetaLine({
      addedBy: "משפחת לוי",
      createdAt: "2026-09-18T19:02:45.017Z",
    });
    assert.match(line ?? "", /משפחת לוי/);
    assert.match(line ?? "", /נוסף על ידי/);
  });

  it("returns null when both fields are missing", () => {
    assert.equal(houseAddedMetaLine({ createdAt: "", addedBy: null }), null);
  });
});
