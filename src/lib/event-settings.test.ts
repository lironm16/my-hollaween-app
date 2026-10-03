import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogEventSettings,
  mergeAddressRevealSchedule,
  normalizeAddressRevealSchedule,
} from "@/lib/event-settings";
import { config } from "@/lib/config";

describe("event settings", () => {
  it("uses config defaults when override is missing", () => {
    assert.deepEqual(mergeAddressRevealSchedule(), {
      hour: config.addressReveal.hour,
      minute: config.addressReveal.minute,
    });
  });

  it("clamps invalid override values", () => {
    assert.deepEqual(normalizeAddressRevealSchedule({ hour: 99, minute: -3 }), {
      hour: 23,
      minute: 0,
    });
  });

  it("builds catalog payload from db override", () => {
    assert.deepEqual(
      catalogEventSettings({
        updatedAt: "2026-10-01T00:00:00.000Z",
        addressReveal: { hour: 18, minute: 30 },
      }),
      {
        addressReveal: { hour: 18, minute: 30 },
        addHouseCutoff: {
          year: config.addHouseCutoff.year,
          month: config.addHouseCutoff.month,
          day: config.addHouseCutoff.day,
          hour: config.addHouseCutoff.hour,
          minute: config.addHouseCutoff.minute,
        },
      },
    );
  });
});
