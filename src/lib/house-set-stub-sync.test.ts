import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { isStubHouse } from "@/lib/house-set";

/** Every seed row must declare stub explicitly — no id-list heuristics. */
describe("seed.json isStub", () => {
  it("matches isStubHouse for every house", () => {
    const seedPath = path.join(process.cwd(), "data/seed.json");
    const seed = JSON.parse(readFileSync(seedPath, "utf8")) as {
      houses?: Array<{ id?: string; isStub?: boolean }>;
    };
    for (const row of seed.houses ?? []) {
      assert.equal(typeof row.isStub, "boolean", `missing isStub on ${row.id}`);
      assert.equal(isStubHouse(row), row.isStub, `isStubHouse mismatch on ${row.id}`);
    }
  });
});
