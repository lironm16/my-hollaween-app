import assert from "node:assert/strict";
import test from "node:test";
import {
  eventCountdownIsZero,
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

test("shouldShowEventCountdown until add-house cutoff (30 Oct 23:59)", () => {
  assert.equal(shouldShowEventCountdown(new Date(2026, 8, 2, 12, 0)), true);
  assert.equal(shouldShowEventCountdown(new Date(2026, 9, 30, 10, 0)), true);
  assert.equal(shouldShowEventCountdown(new Date(2026, 9, 30, 23, 58, 59)), true);
  assert.equal(shouldShowEventCountdown(new Date(2026, 9, 30, 23, 59, 0)), false);
  assert.equal(shouldShowEventCountdown(new Date(2026, 10, 1, 10, 0)), false);
});

test("eventCountdownRemaining on Oct 30 morning", () => {
  const parts = eventCountdownRemaining(new Date(2026, 9, 30, 10, 0));
  assert.ok(parts);
  assert.equal(parts!.days, 0);
  assert.equal(parts!.time, "13:59:00");
});

test("eventCountdownRemaining counts down to 30 Oct 23:59", () => {
  const parts = eventCountdownRemaining(new Date(2026, 8, 2, 12, 0));
  assert.ok(parts);
  assert.equal(parts!.days, 58);
  assert.equal(parts!.time, "11:59:00");
});

test("eventCountdownIsZero", () => {
  assert.equal(
    eventCountdownIsZero({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      time: "00:00:00",
      label: "0 Days · 00:00:00",
    }),
    true,
  );
  assert.equal(
    eventCountdownIsZero({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 1,
      time: "00:00:01",
      label: "0 Days · 00:00:01",
    }),
    false,
  );
});

test("eventCountdownRemaining uses local calendar days across DST (Israel)", () => {
  const parts = eventCountdownRemaining(new Date(2026, 8, 23, 14, 6, 0));
  assert.ok(parts);
  assert.equal(parts!.days, 37);
  assert.equal(parts!.time, "09:53:00");
});
