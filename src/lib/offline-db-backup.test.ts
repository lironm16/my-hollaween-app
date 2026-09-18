import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { backupIsNewerThanServer, type ServerDbBackup } from "@/lib/offline-db";

function backup(updatedAt: string, count: number): ServerDbBackup {
  return {
    updatedAt,
    houses: Array.from({ length: count }, (_, i) => ({
      id: `h${i}`,
      updatedAt,
    })),
  };
}

describe("backupIsNewerThanServer", () => {
  it("returns true when backup timestamp is newer", () => {
    assert.equal(
      backupIsNewerThanServer(backup("2026-10-31T12:00:00.000Z", 3), "2026-10-31T10:00:00.000Z"),
      true,
    );
  });

  it("returns false when backup timestamp is older", () => {
    assert.equal(
      backupIsNewerThanServer(backup("2026-10-31T08:00:00.000Z", 26), "2026-10-31T10:00:00.000Z"),
      false,
    );
  });

  it("returns false when timestamps match even if backup has more houses", () => {
    assert.equal(
      backupIsNewerThanServer(backup("2026-10-31T10:00:00.000Z", 26), "2026-10-31T10:00:00.000Z"),
      false,
    );
  });

  it("returns false when backup has more houses but an older timestamp", () => {
    assert.equal(
      backupIsNewerThanServer(backup("2026-10-31T08:00:00.000Z", 26), "2026-10-31T10:00:00.000Z"),
      false,
    );
  });
});
