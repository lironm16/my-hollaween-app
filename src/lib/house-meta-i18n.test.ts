import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { houseAddedMetaLineLocalized } from "@/lib/house-meta-i18n";

describe("houseAddedMetaLineLocalized", () => {
  it("keeps Hebrew submitter name in English UI", () => {
    const line = houseAddedMetaLineLocalized(
      "en",
      { createdAt: "2024-10-01T12:00:00.000Z", addedBy: "משפחת יריב" },
      { showSubmitterName: true },
    );
    assert.match(line ?? "", /משפחת יריב/);
    assert.doesNotMatch(line ?? "", /Yariv/i);
  });
});
