import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { resetActivitySyncForTests } from "@/lib/activity-sync";
import { clearSkipNote, getSkipNote, saveSkipNote } from "@/lib/offline-db";

describe("skip notes", () => {
  beforeEach(() => {
    if (typeof localStorage === "undefined") return;
    localStorage.clear();
  });

  it("stores and clears a personal skip note per house", () => {
    if (typeof localStorage === "undefined") return;
    saveSkipNote("house-1", "  too scary for the kids  ");
    assert.equal(getSkipNote("house-1"), "too scary for the kids");
    clearSkipNote("house-1");
    assert.equal(getSkipNote("house-1"), undefined);
  });
});

describe("activity sync guard", () => {
  it("resets dedupe state for tests", () => {
    resetActivitySyncForTests();
    assert.doesNotThrow(() => resetActivitySyncForTests());
  });
});
