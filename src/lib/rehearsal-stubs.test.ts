import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  housesForIsolatedTestDb,
  loadStaticRehearsalStubRows,
  stripStubHouses,
} from "@/lib/rehearsal-stubs";

describe("loadStaticRehearsalStubRows", () => {
  it("loads rehearsal stubs from seed.json and drops בית-9316", async () => {
    const rows = await loadStaticRehearsalStubRows();
    assert.ok(rows.some((house) => house.id === "בית-9318"));
    assert.ok(!rows.some((house) => house.id === "בית-9316"));
    for (const house of rows) {
      assert.match(String(house.description ?? ""), /סטאב לחזרה|בית-931/);
    }
  });
});

describe("housesForIsolatedTestDb", () => {
  it("scrubs rehearsal markers and drops בית-931 rehearsal-only pins", () => {
    const houses = [
      { id: "בית-1847", description: "סטאב לחזרה — דלעות על המדרגה." },
      { id: "בית-9310", description: "סטאב לחזרה — נפתח בקרוב." },
    ];
    const isolated = housesForIsolatedTestDb(houses);
    assert.deepEqual(
      isolated.map((house) => house.id),
      ["בית-1847"],
    );
    assert.equal(isolated[0]?.description, "דלעות על המדרגה.");
  });
});

describe("stripStubHouses", () => {
  it("removes rehearsal stub rows from house arrays", () => {
    const houses = [
      { id: "real-1", description: "בית אמיתי" },
      { id: "בית-9310", description: "סטאב לחזרה — נפתח בקרוב." },
      { id: "בית-1847", description: "סטאב לחזרה — דלעות על המדרגה." },
    ];
    const real = stripStubHouses(houses);
    assert.deepEqual(
      real.map((house) => house.id),
      ["real-1"],
    );
  });
});
