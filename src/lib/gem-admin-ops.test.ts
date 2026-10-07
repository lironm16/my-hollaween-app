import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAdminGemMapRows,
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
    isStub: true,
    photoUrl: "/images/stubs/pumpkin-porch.jpg",
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    kind: "house",
    boothNumber: 1,
    ...overrides,
  };
}

describe("gem-admin-ops", () => {
  it("admin map rows include every catalog house", () => {
    const rows = buildAdminGemMapRows([
      stub("בית-a", 32, 34, { boothNumber: 1, address: "חרוזים 1" }),
      stub("בית-b", 32.01, 34.01, { boothNumber: 2, address: "ביה״ס ניצנים" }),
    ]);
    assert.equal(rows.length, 2);
  });

  it("counts monsters on the map set", () => {
    const rows = buildGemMapHouseRows(
      [
        stub("בית-9323", 32.08, 34.78, { boothNumber: 1 }),
        stub("בית-9324", 32.09, 34.79, { boothNumber: 2 }),
      ],
      "stubs",
      { includeAllHouses: true },
    );
    const counts = countGemsOnMapByMonster(rows);
    assert.ok(counts.size >= 1);
    assert.equal([...counts.values()].reduce((a, b) => a + b, 0), 2);
  });

  it("finds closest row to a point", () => {
    const rows = buildGemMapHouseRows(
      [
        stub("בית-far", 32.1, 34.8, { boothNumber: 3 }),
        stub("בית-near", 32.0801, 34.7801, { boothNumber: 4 }),
      ],
      "stubs",
    );
    const near = closestGemMapRow({ lat: 32.08, lng: 34.78 }, rows, "all");
    assert.ok(near);
    assert.equal(near!.house.id, "בית-near");
    assert.ok(near!.distanceM < 50);
  });

  it("filters by text query", () => {
    const rows = buildGemMapHouseRows(
      [
        stub("בית-aaa", 32, 34, { boothNumber: 5 }),
        stub("בית-bbb", 32, 34, { boothNumber: 6 }),
      ],
      "stubs",
    );
    rows[0]!.house.name = "משפחת לוי";
    const filtered = filterGemMapRows(rows, { query: "לוי" });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]!.house.name, "משפחת לוי");
  });
});
