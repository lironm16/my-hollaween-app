import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("push disabled catalog gate", () => {
  it("ignores push template timestamps when NEXT_PUBLIC_PUSH_ALERTS=0", async () => {
    const prev = process.env.NEXT_PUBLIC_PUSH_ALERTS;
    process.env.NEXT_PUBLIC_PUSH_ALERTS = "0";
    try {
      const { catalogDeltaGatePassed } = await import("@/lib/store");
      assert.equal(
        catalogDeltaGatePassed({
          sinceMs: Date.parse("2026-09-21T11:00:00.000Z"),
          catalogUpdatedAt: "2026-09-21T10:00:00.000Z",
          pushUpdatedAt: "2026-09-21T12:00:00.000Z",
          removedIds: [],
        }),
        true,
      );
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_PUSH_ALERTS;
      else process.env.NEXT_PUBLIC_PUSH_ALERTS = prev;
    }
  });
});
