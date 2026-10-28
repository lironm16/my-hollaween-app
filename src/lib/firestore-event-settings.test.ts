import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { firestoreEventSettingsFieldDeletes } from "@/lib/firestore-db";

describe("firestore event settings field deletes", () => {
  it("clears countdownBanner when re-enabling the banner", () => {
    assert.deepEqual(
      firestoreEventSettingsFieldDeletes(
        { updatedAt: "2026-10-01T00:00:00.000Z", countdownBanner: false },
        { updatedAt: "2026-10-02T00:00:00.000Z" },
      ),
      ["countdownBanner"],
    );
  });

  it("does not delete countdownBanner when hiding the banner", () => {
    assert.deepEqual(
      firestoreEventSettingsFieldDeletes(
        { updatedAt: "2026-10-01T00:00:00.000Z", countdownBanner: false },
        { updatedAt: "2026-10-02T00:00:00.000Z", countdownBanner: false },
      ),
      [],
    );
  });

  it("clears gemHuntPublic when disabling public gem hunt", () => {
    assert.deepEqual(
      firestoreEventSettingsFieldDeletes(
        { updatedAt: "2026-10-01T00:00:00.000Z", gemHuntPublic: true },
        { updatedAt: "2026-10-02T00:00:00.000Z" },
      ),
      ["gemHuntPublic"],
    );
  });
});
