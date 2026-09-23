import assert from "node:assert/strict";
import { test } from "node:test";
import { isUserMidInteraction } from "@/lib/sw-idle";

test("isUserMidInteraction is false with no DOM", () => {
  assert.equal(isUserMidInteraction(), false);
});
