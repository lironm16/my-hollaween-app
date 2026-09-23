import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  catalogNeedsFullRefresh,
  countRealHouses,
  resolveCatalogHouses,
} from "@/lib/catalog-houses";
import type { Catalog, PublicHouse } from "@/lib/types";

const CATALOG_LS_KEY = "hw-catalog-cache";
const hasLocalStorage = typeof localStorage !== "undefined";

function house(id: string, patch: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id,
    name: id,
    theme: "pumpkin",
    address: "חרוזים",
    arrival: "",
    description: "",
    lat: 32.09,
    lng: 34.81,
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
    createdAt: "2026-10-31T10:00:00.000Z",
    updatedAt: "2026-10-31T10:00:00.000Z",
    ...patch,
  } as PublicHouse;
}

function catalog(houses: PublicHouse[], updatedAt: string): Catalog {
  return { updatedAt, neighborhood: "test", houses };
}

describe("catalogNeedsFullRefresh", () => {
  it("flags small real-house caches for a full snapshot reload", () => {
    const partial = catalog(
      [
        house("a"),
        house("b"),
        house("c"),
        house("d"),
      ],
      "2026-10-31T10:00:00.000Z",
    );
    assert.equal(countRealHouses(partial), 4);
    assert.equal(catalogNeedsFullRefresh(partial), true);
  });

  it("does not force refresh for stub-only rehearsal catalogs", () => {
    const stubs = catalog(
      [house("בית-9311", { description: "סטאב לחזרה" })],
      "2026-10-31T10:00:00.000Z",
    );
    assert.equal(catalogNeedsFullRefresh(stubs), false);
  });

  it("accepts a typical neighborhood catalog size", () => {
    const full = catalog(
      Array.from({ length: 12 }, (_, index) => house(`house-${index}`)),
      "2026-10-31T10:00:00.000Z",
    );
    assert.equal(catalogNeedsFullRefresh(full), false);
  });
});

describe("resolveCatalogHouses", { skip: !hasLocalStorage }, () => {
  beforeEach(() => {
    localStorage.removeItem(CATALOG_LS_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(CATALOG_LS_KEY);
  });

  it("returns cached houses when live catalog is empty", () => {
    const cached = catalog(
      [house("a", { updatedAt: "2026-10-31T10:00:00.000Z" })],
      "2026-10-31T10:00:00.000Z",
    );
    localStorage.setItem(CATALOG_LS_KEY, JSON.stringify(cached));
    assert.deepEqual(resolveCatalogHouses(null).map((item) => item.id), ["a"]);
  });

  it("keeps cached ids when live catalog is a newer partial delta", () => {
    const cached = catalog(
      [
        house("a", { updatedAt: "2026-10-31T09:00:00.000Z" }),
        house("b", { updatedAt: "2026-10-31T09:00:00.000Z" }),
        house("c", { updatedAt: "2026-10-31T09:00:00.000Z" }),
      ],
      "2026-10-31T09:00:00.000Z",
    );
    localStorage.setItem(CATALOG_LS_KEY, JSON.stringify(cached));
    const live = catalog(
      [house("a", { updatedAt: "2026-10-31T12:00:00.000Z" })],
      "2026-10-31T12:00:00.000Z",
    );
    const ids = resolveCatalogHouses(live)
      .map((item) => item.id)
      .sort();
    assert.deepEqual(ids, ["a", "b", "c"]);
  });
});
