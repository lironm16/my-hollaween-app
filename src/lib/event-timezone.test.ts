import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addressRevealTime, isAddressRevealed } from "@/lib/address-reveal";
import { dateInEventTimeZone, EVENT_TIME_ZONE } from "@/lib/event-timezone";

describe("event timezone", () => {
  it("maps Oct 31 12:00 Jerusalem to the same instant everywhere", () => {
    const local = dateInEventTimeZone({ year: 2026, month: 10, day: 31, hour: 12, minute: 0 });
    const reveal = addressRevealTime({ hour: 12, minute: 0 });
    assert.equal(local.getTime(), reveal.getTime());
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: EVENT_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(local);
    const hour = parts.find((p) => p.type === "hour")?.value;
    const minute = parts.find((p) => p.type === "minute")?.value;
    assert.equal(`${hour}:${minute}`, "12:00");
  });

  it("UTC server clock matches Israel reveal (Vercel)", () => {
    const schedule = { hour: 12, minute: 0 };
    const beforeIsrael = new Date("2026-10-31T09:59:00.000Z");
    const afterIsrael = new Date("2026-10-31T10:01:00.000Z");
    assert.equal(isAddressRevealed(beforeIsrael, schedule), false);
    assert.equal(isAddressRevealed(afterIsrael, schedule), true);
  });
});
