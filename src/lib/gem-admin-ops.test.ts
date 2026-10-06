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
    name: `POI ${id}`,
    theme: "pumpkin",
    address: "רחוב 1",
    arrival: "",
    description: "",
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
    kind: "poi",
    poiCategory: "info",
    description: "נקודת עניין לתרגול",
    ...overrides,
  };
}

describe("gem-admin-ops", () => {
  it("counts monsters on the map set", () => {
    const rows = buildGemMapHouseRows([
      stub("נק-1", 32.08, 34.78, { address: "רחוב 1" }),
      stub("נק-2", 32.09, 34.79, { address: "רחוב 2" }),
    ]);
    const counts = countGemsOnMapByMonster(rows);
    assert.ok(counts.size >= 1);
    assert.equal([...counts.values()].reduce((a, b) => a + b, 0), 2);
  });

  it("finds closest row to a point", () => {
    const rows = buildGemMapHouseRows([
      stub("נק-far", 32.1, 34.8, { address: "רחוק 1" }),
      stub("נק-near", 32.0801, 34.7801, { address: "קרוב 1" }),
    ]);
    const near = closestGemMapRow({ lat: 32.08, lng: 34.78 }, rows, "all");
    assert.ok(near);
    assert.equal(near!.house.id, "נק-near");
    assert.ok(near!.distanceM < 50);
  });

  it("filters by text query", () => {
    const rows = buildGemMapHouseRows([
      stub("נק-aaa", 32, 34, { address: "aaa 1" }),
      stub("נק-bbb", 32, 34, { address: "bbb 1" }),
    ]);
    rows[0]!.house.name = "משפחת לוי";
    const filtered = filterGemMapRows(rows, { query: "לוי" });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]!.house.name, "משפחת לוי");
  });
});
