import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalogScopeMismatchesResponse } from "@/lib/night-pass-client";

describe("catalogScopeMismatchesResponse", () => {
  it("flags when the server scoped catalog for public but this device still thinks pass", () => {
    assert.equal(
      catalogScopeMismatchesResponse(
        { enabled: true, viewer: "pass", registered: true },
        "public",
      ),
      true,
    );
  });

  it("ignores legacy / disabled night passes", () => {
    assert.equal(
      catalogScopeMismatchesResponse(
        { enabled: false, viewer: "legacy", registered: false },
        "public",
      ),
      false,
    );
  });

  it("allows matching pass scope", () => {
    assert.equal(
      catalogScopeMismatchesResponse(
        { enabled: true, viewer: "pass", registered: true },
        "pass",
      ),
      false,
    );
  });
});
