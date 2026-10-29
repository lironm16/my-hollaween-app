import assert from "node:assert/strict";
import test from "node:test";
import {
  eventCountdownIsZero,
  eventCountdownRemaining,
  formatEventCountdownParts,
  shouldShowEventCountdown,
} from "@/lib/event-countdown";
import { eventCountdownDateBadgeLabel } from "@/lib/event-countdown-display";

test("formatEventCountdownParts", () => {
  const parts = formatEventCountdownParts(
    (((91 * 24 + 7) * 60 + 22) * 60 + 32) * 1000,
  );
  assert.equal(parts.days, 91);
  assert.equal(parts.time, "07:22:32");
  assert.equal(parts.label, "91 Days · 07:22:32");
});

test("shouldShowEventCountdown until address reveal (31 Oct 12:00 default)", () => {
  assert.equal(shouldShowEventCountdown(new Date(2026, 8, 2, 12, 0)), true);
  assert.equal(shouldShowEventCountdown(new Date(2026, 9, 30, 23, 59, 0)), true);
  assert.equal(shouldShowEventCountdown(new Date(2026, 9, 31, 11, 59, 59)), true);
  assert.equal(shouldShowEventCountdown(new Date(2026, 9, 31, 12, 0, 0)), false);
  assert.equal(shouldShowEventCountdown(new Date(2026, 9, 31, 13, 0, 0)), false);
});

test("shouldShowEventCountdown follows catalog address reveal time", () => {
  const lateReveal = { hour: 18, minute: 30 };
  assert.equal(shouldShowEventCountdown(new Date(2026, 9, 31, 12, 0, 0), lateReveal), true);
  assert.equal(shouldShowEventCountdown(new Date(2026, 9, 31, 18, 30, 0), lateReveal), false);
});

test("eventCountdownRemaining on Oct 30 morning", () => {
  const parts = eventCountdownRemaining(new Date(2026, 9, 30, 10, 0));
  assert.ok(parts);
  assert.equal(parts!.days, 1);
  assert.equal(parts!.time, "02:00:00");
});

test("eventCountdownRemaining counts down to 31 Oct 12:00", () => {
  const parts = eventCountdownRemaining(new Date(2026, 8, 2, 12, 0));
  assert.ok(parts);
  assert.equal(parts!.days, 59);
  assert.equal(parts!.time, "00:00:00");
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
  assert.equal(parts!.time, "21:54:00");
});

test("eventCountdownDateBadgeLabel shows evening jump start, not address reveal", () => {
  assert.equal(eventCountdownDateBadgeLabel(), "17:00 · 31.10");
  assert.equal(
    eventCountdownDateBadgeLabel({
      year: 2026,
      month: 10,
      day: 31,
      openFrom: "17:00",
      openTo: "21:00",
    }),
    "17:00 · 31.10",
  );
});
