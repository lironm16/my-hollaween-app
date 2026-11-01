import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accessibleBooleanFromLevel,
  housePassesAccessibleRouteFilter,
  resolveAccessibilityLevel,
} from "@/lib/house-visitor-fields";

describe("house-visitor-fields", () => {
  it("resolves legacy accessible flag", () => {
    assert.equal(resolveAccessibilityLevel({ accessible: true }), "accessible");
    assert.equal(resolveAccessibilityLevel({ accessible: false }), undefined);
    assert.equal(
      resolveAccessibilityLevel({ accessibilityLevel: "partial", accessible: false }),
      "partial",
    );
  });

  it("syncs accessible boolean", () => {
    assert.equal(accessibleBooleanFromLevel("accessible"), true);
    assert.equal(accessibleBooleanFromLevel("partial"), false);
  });

  it("route filter includes partial", () => {
    assert.equal(housePassesAccessibleRouteFilter({ accessibilityLevel: "partial" }), true);
    assert.equal(housePassesAccessibleRouteFilter({ accessibilityLevel: "not_accessible" }), false);
    assert.equal(housePassesAccessibleRouteFilter({ accessible: true }), true);
  });
});
