import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { abortAfter, withTimeout } from "@/lib/fetch-timeout";

describe("fetch-timeout", () => {
  it("abortAfter aborts after the delay", async () => {
    const signal = abortAfter(30);
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(signal.aborted, true);
  });

  it("withTimeout resolves null when the promise is slow", async () => {
    const value = await withTimeout(new Promise((resolve) => setTimeout(() => resolve(1), 200)), 30);
    assert.equal(value, null);
  });

  it("withTimeout returns the value when the promise finishes in time", async () => {
    const value = await withTimeout(Promise.resolve("ok"), 200);
    assert.equal(value, "ok");
  });
});
