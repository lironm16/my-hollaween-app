import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { firestoreEventSettingsFieldDeletes } from "@/lib/firestore-db";

describe("firestore event settings field deletes", () => {
  it("does not strip countdownBanner — explicit true/false is merged", () => {
    assert.deepEqual(
      firestoreEventSettingsFieldDeletes(
        { updatedAt: "2026-10-01T00:00:00.000Z", countdownBanner: false },
        { updatedAt: "2026-10-02T00:00:00.000Z", countdownBanner: true },
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
