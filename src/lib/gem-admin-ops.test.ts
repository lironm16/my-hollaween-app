import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGemMapHouseRows,
  closestGemMapRow,
  countGemsOnMapByMonster,
  filterGemMapRows,
} from "@/lib/gem-admin-ops";
import type { PublicHouse } from "@/lib/types";

function stub(id: string, lat: number, lng: number): PublicHouse {
  return {
    id,
    name: `בית ${id}`,
    address: "רחוב 1",
    lat,
    lng,
    theme: "pumpkin",
    kind: "house",
    visit: "come",
    candy: "plenty",
    scare: "medium",
    accessibility: "none",
    addedAt: "2026-10-31T12:00:00.000Z",
  } as PublicHouse;
}

describe("gem-admin-ops", () => {
  it("counts monsters on the map set", () => {
    const rows = buildGemMapHouseRows([stub("בית-1", 32.08, 34.78), stub("בית-2", 32.09, 34.79)]);
    const counts = countGemsOnMapByMonster(rows);
    assert.ok(counts.size >= 1);
    assert.equal([...counts.values()].reduce((a, b) => a + b, 0), 2);
  });

  it("finds closest row to a point", () => {
    const rows = buildGemMapHouseRows([
      stub("בית-far", 32.1, 34.8),
      stub("בית-near", 32.0801, 34.7801),
    ]);
    const near = closestGemMapRow({ lat: 32.08, lng: 34.78 }, rows, "all");
    assert.ok(near);
    assert.equal(near!.house.id, "בית-near");
    assert.ok(near!.distanceM < 50);
  });

  it("filters by text query", () => {
    const rows = buildGemMapHouseRows([stub("בית-aaa", 32, 34), stub("בית-bbb", 32, 34)]);
    rows[0]!.house.name = "משפחת לוי";
    const filtered = filterGemMapRows(rows, { query: "לוי" });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]!.house.name, "משפחת לוי");
  });
});
