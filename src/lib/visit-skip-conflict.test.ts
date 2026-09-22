import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  dismissVisitSkipConflictPrompt,
  shouldAskVisitSkipConflict,
} from "@/lib/visit-skip-conflict";

const hasLocalStorage = typeof localStorage !== "undefined";

describe("visit-skip-conflict preference", { skip: !hasLocalStorage }, () => {
  const key = "hw-visit-skip-conflict-dismissed";

  beforeEach(() => {
    localStorage.removeItem(key);
  });

  afterEach(() => {
    localStorage.removeItem(key);
  });

  it("asks by default", () => {
    assert.equal(shouldAskVisitSkipConflict(), true);
  });

  it("stops asking after dismiss", () => {
    dismissVisitSkipConflictPrompt();
    assert.equal(shouldAskVisitSkipConflict(), false);
  });
});
