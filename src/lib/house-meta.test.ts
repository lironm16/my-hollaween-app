import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { houseAddedMetaLine } from "@/lib/house-meta";

describe("houseAddedMetaLine", () => {
  it("combines who and when for admin view", () => {
    const line = houseAddedMetaLine(
      {
        addedBy: "משפחת לוי",
        createdAt: "2026-09-18T19:02:45.017Z",
      },
      { showSubmitterName: true },
    );
    assert.match(line ?? "", /משפחת לוי/);
    assert.match(line ?? "", /נוסף על ידי/);
  });

  it("shows only when for public view", () => {
    const line = houseAddedMetaLine({
      addedBy: "משפחת לוי",
      createdAt: "2026-09-18T19:02:45.017Z",
    });
    assert.match(line ?? "", /נוסף /);
    assert.doesNotMatch(line ?? "", /משפחת לוי/);
    assert.doesNotMatch(line ?? "", /נוסף על ידי/);
  });

  it("returns null when both fields are missing", () => {
    assert.equal(houseAddedMetaLine({ createdAt: "", addedBy: null }), null);
  });
});
