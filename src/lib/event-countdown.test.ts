import assert from "node:assert/strict";
import test from "node:test";
import {
  eventCountdownRemaining,
  formatEventCountdownParts,
  shouldShowEventCountdown,
} from "@/lib/event-countdown";

test("formatEventCountdownParts", () => {
  const parts = formatEventCountdownParts(
    (((91 * 24 + 7) * 60 + 22) * 60 + 32) * 1000,
  );
  assert.equal(parts.days, 91);
  assert.equal(parts.time, "07:22:32");
  assert.equal(parts.label, "91 Days · 07:22:32");
});

test("shouldShowEventCountdown until 17:00 on Oct 31", () => {
  assert.equal(shouldShowEventCountdown(new Date(2026, 8, 2, 12, 0)), true);
  assert.equal(shouldShowEventCountdown(new Date(2026, 9, 31, 10, 0)), true);
  assert.equal(shouldShowEventCountdown(new Date(2026, 9, 31, 16, 59, 59)), true);
  assert.equal(shouldShowEventCountdown(new Date(2026, 9, 31, 17, 0, 0)), false);
  assert.equal(shouldShowEventCountdown(new Date(2026, 10, 1, 10, 0)), false);
});

test("eventCountdownRemaining on Halloween morning", () => {
  const parts = eventCountdownRemaining(new Date(2026, 9, 31, 10, 0));
  assert.ok(parts);
  assert.equal(parts!.days, 0);
  assert.equal(parts!.time, "07:00:00");
});

test("eventCountdownRemaining counts down to 17:00 on Oct 31", () => {
  const parts = eventCountdownRemaining(new Date(2026, 8, 2, 12, 0));
  assert.ok(parts);
  assert.equal(parts!.days, 59);
  assert.equal(parts!.time, "05:00:00");
});
