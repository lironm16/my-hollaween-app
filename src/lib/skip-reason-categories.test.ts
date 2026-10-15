import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeSkipReasonCategory, skipReasonPreview } from "@/lib/skip-reason-categories";

describe("skip-reason-categories", () => {
  it("normalizes legacy candy reasons", () => {
    assert.equal(normalizeSkipReasonCategory("candy-low"), "candy-out");
    assert.equal(normalizeSkipReasonCategory("not-open"), "not-open");
  });

  it("builds preview line", () => {
    assert.equal(skipReasonPreview("not-open", "מחר"), "הבית לא פתוח · מחר");
  });
});
