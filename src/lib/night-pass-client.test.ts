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

  it("flags when night passes were turned on server-side but client is still legacy", () => {
    assert.equal(
      catalogScopeMismatchesResponse(
        { enabled: false, viewer: "legacy", registered: false },
        "public",
      ),
      true,
    );
  });

  it("flags when night passes were turned off server-side but client still has pass mode", () => {
    assert.equal(
      catalogScopeMismatchesResponse(
        { enabled: true, viewer: "public", registered: false },
        undefined,
      ),
      true,
    );
  });

  it("allows matching legacy mode (no scope on payload)", () => {
    assert.equal(
      catalogScopeMismatchesResponse(
        { enabled: false, viewer: "legacy", registered: false },
        undefined,
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
