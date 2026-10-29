import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeDb } from "@/lib/store/core";
import type { DbFile } from "@/lib/types";

describe("normalizeDb countdown banner", () => {
  it("keeps explicit countdownBanner true for later Firestore merges", () => {
    const db: DbFile = {
      updatedAt: "2026-10-01T00:00:00.000Z",
      houses: [],
      eventSettings: {
        updatedAt: "2026-10-02T00:00:00.000Z",
        countdownBanner: true,
      },
    };
    const normalized = normalizeDb(db);
    assert.equal(normalized.eventSettings?.countdownBanner, true);
  });
});
