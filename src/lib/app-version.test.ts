import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { appVersion, appVersionLabel } from "@/lib/app-version";

describe("appVersion", () => {
  const prev = process.env.NEXT_PUBLIC_APP_VERSION;

  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_VERSION;
    else process.env.NEXT_PUBLIC_APP_VERSION = prev;
  });

  it("reads semver from env", () => {
    process.env.NEXT_PUBLIC_APP_VERSION = "1.2.3";
    assert.equal(appVersion(), "1.2.3");
    assert.equal(appVersionLabel(), "v1.2.3");
  });

  it("falls back to dev when unset", () => {
    delete process.env.NEXT_PUBLIC_APP_VERSION;
    assert.equal(appVersion(), "dev");
  });
});
