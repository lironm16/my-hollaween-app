import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  housesForIsolatedTestDb,
  loadStaticRehearsalStubRows,
  stripStubHouses,
} from "@/lib/rehearsal-stubs";

describe("loadStaticRehearsalStubRows", () => {
  it("loads stub rows from seed.json and drops בית-9316", async () => {
    const rows = await loadStaticRehearsalStubRows();
    assert.ok(rows.some((house) => house.id === "בית-9318"));
    assert.ok(!rows.some((house) => house.id === "בית-9316"));
    for (const house of rows) {
      assert.equal(house.isStub, true, house.id);
    }
  });
});

describe("housesForIsolatedTestDb", () => {
  it("drops stub rows", () => {
    const houses = [
      { id: "real-1", isStub: false },
      { id: "בית-9310", isStub: true },
    ];
    const isolated = housesForIsolatedTestDb(houses);
    assert.deepEqual(isolated.map((house) => house.id), ["real-1"]);
  });
});

describe("stripStubHouses", () => {
  it("removes stub rows from house arrays", () => {
    const houses = [
      { id: "real-1", isStub: false },
      { id: "בית-9310", isStub: true },
      { id: "בית-1847", isStub: true },
    ];
    const real = stripStubHouses(houses);
    assert.deepEqual(real.map((house) => house.id), ["real-1"]);
  });
});
