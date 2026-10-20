import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldStartGeoWatchOnBoot, trustPermissionsQueryDenied } from "@/lib/geo-watch-boot";

describe("shouldStartGeoWatchOnBoot", () => {
  it("starts watch for granted, prompt, and unknown", () => {
    assert.equal(shouldStartGeoWatchOnBoot("granted"), true);
    assert.equal(shouldStartGeoWatchOnBoot("prompt"), true);
    assert.equal(shouldStartGeoWatchOnBoot("unknown"), true);
  });

  it("does not start when denied", () => {
    assert.equal(shouldStartGeoWatchOnBoot("denied"), false);
  });
});

describe("trustPermissionsQueryDenied", () => {
  it("is exported for platform-specific geo boot", () => {
    assert.equal(typeof trustPermissionsQueryDenied(), "boolean");
  });
});
