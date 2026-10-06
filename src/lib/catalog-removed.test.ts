import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { Catalog } from "@/lib/types";
import {
  clearCatalogRemoved,
  deviceHouseEditAllowed,
  isCatalogRemoved,
  noteCatalogRemovals,
  trackCatalogRemovalDelta,
} from "@/lib/catalog-removed";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => {
      storage.set(key, value);
    },
    removeItem: (key) => {
      storage.delete(key);
    },
    clear: () => storage.clear(),
    key: () => null,
    length: 0,
  };
  (globalThis as { window?: Window }).window = {
    dispatchEvent: () => true,
  } as unknown as Window;
});

function catalog(updatedAt: string, ids: string[]): Catalog {
  return {
    updatedAt,
    neighborhood: "שכונה",
    houses: ids.map((id) => ({
      id,
      name: id,
      theme: "pumpkin",
      address: "",
      arrival: "",
      description: "",
      lat: 0,
      lng: 0,
      treats: [],
      treatStock: {},
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
      createdAt: updatedAt,
      updatedAt,
    })),
  };
}

describe("catalog-removed", () => {
  it("records explicit removals from delta polls", () => {
    noteCatalogRemovals(["a"], "2026-10-31T12:00:00.000Z");
    assert.equal(isCatalogRemoved("a"), true);
    assert.equal(isCatalogRemoved("b"), false);
  });

  it("tracks houses dropped between catalog snapshots", () => {
    const prev = catalog("2026-10-31T10:00:00.000Z", ["a", "b"]);
    const next = catalog("2026-10-31T12:00:00.000Z", ["b"]);
    trackCatalogRemovalDelta(prev, next, undefined);
    assert.equal(isCatalogRemoved("a"), true);
    assert.equal(isCatalogRemoved("b"), false);
  });

  it("clears removal when the house returns to the catalog", () => {
    noteCatalogRemovals(["a"], "2026-10-31T12:00:00.000Z");
    clearCatalogRemoved("a");
    assert.equal(isCatalogRemoved("a"), false);
  });

  it("blocks device edit when removed from the catalog", () => {
    noteCatalogRemovals(["a"], "2026-10-31T12:00:00.000Z");
    assert.equal(deviceHouseEditAllowed("a"), false);
    assert.equal(deviceHouseEditAllowed("b"), true);
  });
});
