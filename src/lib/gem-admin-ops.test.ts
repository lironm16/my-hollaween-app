import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGemMapHouseRows,
  closestGemMapRow,
  countGemsOnMapByMonster,
  filterGemMapRows,
} from "@/lib/gem-admin-ops";
import type { PublicHouse } from "@/lib/types";

function stub(id: string, lat: number, lng: number, overrides: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id,
    name: `דוכן ${id}`,
    theme: "pumpkin",
    address: "ביה״ס המנחיל",
    arrival: "",
    description: "דוכן בביה״ס המנחיל",
    lat,
    lng,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    visit: "come",
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    openHours: [{ from: "17:00", to: "21:00" }],
    openFrom2: "",
    openTo2: "",
    notes: "",
    accessible: true,
    decorLevel: "medium",
    decorated: true,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    kind: "house",
    boothNumber: 1,
    ...overrides,
  };
}

describe("gem-admin-ops", () => {
  it("counts monsters on the map set", () => {
    const rows = buildGemMapHouseRows([
      stub("בית-9323", 32.08, 34.78, { boothNumber: 1 }),
      stub("בית-9324", 32.09, 34.79, { boothNumber: 2 }),
    ]);
    const counts = countGemsOnMapByMonster(rows);
    assert.ok(counts.size >= 1);
    assert.equal([...counts.values()].reduce((a, b) => a + b, 0), 2);
  });

  it("finds closest row to a point", () => {
    const rows = buildGemMapHouseRows([
      stub("בית-far", 32.1, 34.8, { boothNumber: 3 }),
      stub("בית-near", 32.0801, 34.7801, { boothNumber: 4 }),
    ]);
    const near = closestGemMapRow({ lat: 32.08, lng: 34.78 }, rows, "all");
    assert.ok(near);
    assert.equal(near!.house.id, "בית-near");
    assert.ok(near!.distanceM < 50);
  });

  it("filters by text query", () => {
    const rows = buildGemMapHouseRows([
      stub("בית-aaa", 32, 34, { boothNumber: 5 }),
      stub("בית-bbb", 32, 34, { boothNumber: 6 }),
    ]);
    rows[0]!.house.name = "משפחת לוי";
    const filtered = filterGemMapRows(rows, { query: "לוי" });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]!.house.name, "משפחת לוי");
  });
});
