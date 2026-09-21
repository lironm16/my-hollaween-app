import assert from "node:assert/strict";
import { describe, it } from "node:test";

async function withPushAlertsFlag(
  value: string | undefined,
  fn: () => Promise<void> | void,
) {
  const prev = process.env.NEXT_PUBLIC_PUSH_ALERTS;
  if (value === undefined) delete process.env.NEXT_PUBLIC_PUSH_ALERTS;
  else process.env.NEXT_PUBLIC_PUSH_ALERTS = value;
  try {
    await fn();
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_PUSH_ALERTS;
    else process.env.NEXT_PUBLIC_PUSH_ALERTS = prev;
  }
}

describe("push disabled catalog gate", () => {
  it("defaults off and ignores push template timestamps", async () => {
    await withPushAlertsFlag(undefined, async () => {
      const { pushAlertsEnabled } = await import("@/lib/push-enabled");
      assert.equal(pushAlertsEnabled(), false);

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
    });
  });

  it("ignores push template timestamps when NEXT_PUBLIC_PUSH_ALERTS=0", async () => {
    await withPushAlertsFlag("0", async () => {
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
    });
  });

  it("honors push template timestamps when NEXT_PUBLIC_PUSH_ALERTS=1", async () => {
    await withPushAlertsFlag("1", async () => {
      const { pushAlertsEnabled } = await import("@/lib/push-enabled");
      assert.equal(pushAlertsEnabled(), true);

      const { catalogDeltaGatePassed } = await import("@/lib/store");
      assert.equal(
        catalogDeltaGatePassed({
          sinceMs: Date.parse("2026-09-21T11:00:00.000Z"),
          catalogUpdatedAt: "2026-09-21T10:00:00.000Z",
          pushUpdatedAt: "2026-09-21T12:00:00.000Z",
          removedIds: [],
        }),
        false,
      );
    });
  });
});
