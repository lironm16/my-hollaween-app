import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { isStubHouse } from "@/lib/house-set";
import { REHEARSAL_STUB_IDS } from "@/lib/rehearsal-stub-ids";

describe("REHEARSAL_STUB_IDS", () => {
  it("matches rehearsal rows in seed.json", () => {
    const seedPath = path.join(process.cwd(), "data/seed.json");
    const seed = JSON.parse(readFileSync(seedPath, "utf8")) as {
      houses?: Array<{ id?: string; description?: string; photoUrl?: string }>;
    };
    const fromSeed = (seed.houses ?? [])
      .filter((row) => isStubHouse(row))
      .map((row) => row.id!)
      .sort();
    assert.deepEqual([...REHEARSAL_STUB_IDS].sort(), fromSeed);
  });

  it("detects stripped device-cache rehearsal rows by id", () => {
    assert.equal(
      isStubHouse({
        id: "בית-1847",
        description: "",
        photoUrl: "",
        deviceCachePin: true,
      }),
      true,
    );
  });
});
