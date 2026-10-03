import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clockSnapshot,
  dateForRehearsalScene,
  formatCustomRehearsalClock,
  isRehearsalOn,
} from "@/lib/app-clock";
import { config } from "@/lib/config";

describe("app clock / rehearsal", () => {
  it("maps dry-run scenes to fixed event-night instants", () => {
    const open = dateForRehearsalScene("open");
    assert.ok(open);
    assert.equal(open!.getHours(), 18);
    assert.equal(open!.getMinutes(), 0);
    assert.equal(open!.getFullYear(), config.eventNight.year);
  });

  it("freezes clock snapshot for non-today rehearsal scenes", () => {
    const wall = new Date("2026-10-01T12:34:56.789Z");
    const a = clockSnapshot(wall, "open");
    const b = clockSnapshot(new Date("2026-10-01T12:34:57.000Z"), "open");
    assert.equal(a, b);
    assert.notEqual(a, 0);
  });

  it("ticks wall clock when rehearsal is off", () => {
    const t0 = new Date("2026-10-01T12:34:56.789Z").getTime();
    const t1 = t0 + 20_000;
    assert.notEqual(clockSnapshot(new Date(t0), "off"), clockSnapshot(new Date(t1), "off"));
  });

  it("formats custom rehearsal clock labels", () => {
    assert.equal(formatCustomRehearsalClock({ hours: 8, minutes: 5 }), "08:05");
  });

  it("detects rehearsal mode", () => {
    assert.equal(isRehearsalOn("off"), false);
    assert.equal(isRehearsalOn("open"), true);
  });
});
