import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getMem, isMemWarm, memReadAtIso, replaceMemKeepAge, setMem } from "@/lib/store/core";
import type { DbFile } from "@/lib/types";

function db(updatedAt: string): DbFile {
  return { updatedAt, houses: [], pushSubscriptions: [] };
}

describe("mem freshness", () => {
  it("replaceMemKeepAge swaps contents without extending the read time", async () => {
    setMem(db("2026-10-31T12:00:00.000Z"));
    const readAt = memReadAtIso();
    assert.ok(readAt);
    await new Promise((resolve) => setTimeout(resolve, 5));
    replaceMemKeepAge(db("2026-10-31T12:05:00.000Z"));
    assert.equal(getMem()?.updatedAt, "2026-10-31T12:05:00.000Z");
    assert.equal(memReadAtIso(), readAt);
    assert.equal(isMemWarm(), true);
  });
});
