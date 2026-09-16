import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPreviewDeploy } from "@/lib/preview-deploy";

describe("isPreviewDeploy", () => {
  it("is true when VERCEL_ENV is preview", () => {
    const prev = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "preview";
    assert.equal(isPreviewDeploy(), true);
    process.env.VERCEL_ENV = prev;
  });

  it("is false on production", () => {
    const prev = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "production";
    assert.equal(isPreviewDeploy(), false);
    process.env.VERCEL_ENV = prev;
  });
});
