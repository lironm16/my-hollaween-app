import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCatalogDeltaFromDb,
  catalogRemovalsSinceIso,
  recordCatalogRemoval,
} from "@/lib/store";
import type { DbFile, House } from "@/lib/types";

function house(id: string, updatedAt: string, patch: Partial<House> = {}): House {
  return {
    id,
    name: `בית ${id}`,
    theme: "pumpkin",
    address: "חרוזים 1",
    arrival: "",
    description: "",
    lat: 32.09,
    lng: 34.81,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    visit: "come",
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    notes: "",
    accessible: false,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    editCode: "edit",
    createdAt: updatedAt,
    updatedAt,
    ...patch,
  };
}

function db(updatedAt: string, houses: House[]): DbFile {
  return { updatedAt, houses };
}

describe("buildCatalogDeltaFromDb", () => {
  it("returns houses updated after since", () => {
    const snapshot = db("2026-10-31T12:00:00.000Z", [
      house("a", "2026-10-31T10:00:00.000Z"),
      house("b", "2026-10-31T12:00:00.000Z"),
    ]);
    const delta = buildCatalogDeltaFromDb(snapshot, "2026-10-31T11:00:00.000Z");
    assert.deepEqual(delta.houses.map((row) => row.id), ["b"]);
    assert.deepEqual(delta.removed, []);
  });

  it("passes through removed ids", () => {
    const snapshot = db("2026-10-31T12:00:00.000Z", [house("a", "2026-10-31T10:00:00.000Z")]);
    const delta = buildCatalogDeltaFromDb(snapshot, "2026-10-31T11:00:00.000Z", ["gone"]);
    assert.deepEqual(delta.removed, ["gone"]);
  });

  it("returns empty houses when nothing changed after since", () => {
    const snapshot = db("2026-10-31T12:00:00.000Z", [
      house("a", "2026-10-31T10:00:00.000Z"),
    ]);
    const delta = buildCatalogDeltaFromDb(snapshot, "2026-10-31T11:00:00.000Z");
    assert.equal(delta.houses.length, 0);
  });
});

describe("recordCatalogRemoval", () => {
  it("records tombstones newer than since", () => {
    recordCatalogRemoval("gone-house", "2026-10-31T12:00:00.000Z");
    assert.deepEqual(catalogRemovalsSinceIso("2026-10-31T11:00:00.000Z"), ["gone-house"]);
    assert.deepEqual(catalogRemovalsSinceIso("2026-10-31T13:00:00.000Z"), []);
  });
});
