import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalogDeltaGatePassed } from "@/lib/store";

describe("catalogDeltaGatePassed", () => {
  it("passes when catalog and push are older than since", () => {
    assert.equal(
      catalogDeltaGatePassed({
        sinceMs: Date.parse("2026-10-31T12:00:00.000Z"),
        catalogUpdatedAt: "2026-10-31T11:00:00.000Z",
        pushUpdatedAt: "2026-10-31T10:00:00.000Z",
        removedIds: [],
      }),
      true,
    );
  });

  it("fails when a house changed after since", () => {
    assert.equal(
      catalogDeltaGatePassed({
        sinceMs: Date.parse("2026-10-31T11:00:00.000Z"),
        catalogUpdatedAt: "2026-10-31T12:00:00.000Z",
        removedIds: [],
      }),
      false,
    );
  });

  it("fails when push templates changed after since", () => {
    const prev = process.env.NEXT_PUBLIC_PUSH_ALERTS;
    process.env.NEXT_PUBLIC_PUSH_ALERTS = "1";
    try {
      assert.equal(
        catalogDeltaGatePassed({
          sinceMs: Date.parse("2026-10-31T11:00:00.000Z"),
          catalogUpdatedAt: "2026-10-31T10:00:00.000Z",
          pushUpdatedAt: "2026-10-31T12:00:00.000Z",
          removedIds: [],
        }),
        false,
      );
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_PUSH_ALERTS;
      else process.env.NEXT_PUBLIC_PUSH_ALERTS = prev;
    }
  });

  it("fails when removals are pending", () => {
    assert.equal(
      catalogDeltaGatePassed({
        sinceMs: Date.parse("2026-10-31T11:00:00.000Z"),
        catalogUpdatedAt: "2026-10-31T10:00:00.000Z",
        removedIds: ["gone"],
      }),
      false,
    );
  });
});
