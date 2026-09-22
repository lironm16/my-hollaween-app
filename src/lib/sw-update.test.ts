import assert from "node:assert/strict";
import { test } from "node:test";
import { isServiceWorkerUpdateReady, versionsDiffer } from "@/lib/sw-update";

test("isServiceWorkerUpdateReady is false on first install", () => {
  assert.equal(isServiceWorkerUpdateReady("installed", false), false);
});

test("isServiceWorkerUpdateReady is true when an update is waiting", () => {
  assert.equal(isServiceWorkerUpdateReady("installed", true), true);
});

test("versionsDiffer compares trimmed semver strings", () => {
  assert.equal(versionsDiffer("0.1.8", "0.1.8"), false);
  assert.equal(versionsDiffer("0.1.8", "0.1.9"), true);
  assert.equal(versionsDiffer(" 0.1.8 ", "0.1.8"), false);
});
