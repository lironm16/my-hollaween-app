import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  catalogCacheIncomplete,
  catalogNeedsFullRefresh,
  localCatalogHouseCount,
  resolveCatalogHouses,
  resolveServerHouseCount,
} from "@/lib/catalog-houses";
import {
  loadCatalogCacheMeta,
  saveCatalogCache,
  saveCatalogCacheMeta,
  loadCatalogCacheSync,
} from "@/lib/offline-db";
import type { Catalog, CatalogCacheMeta, PublicHouse } from "@/lib/types";

const CATALOG_LS_KEY = "hw-catalog-cache";
const CATALOG_META_LS_KEY = "hw-catalog-cache-meta";
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

function catalog(
  houses: PublicHouse[],
  updatedAt: string,
  meta: Partial<Pick<Catalog, "houseCount">> = {},
): Catalog {
  return { updatedAt, neighborhood: "test", houses, ...meta };
}

describe("resolveServerHouseCount", () => {
  it("prefers explicit houseCount over inline houses", () => {
    assert.equal(resolveServerHouseCount(catalog([house("a")], "2026-10-31T10:00:00.000Z", { houseCount: 25 })), 25);
  });

  it("falls back to inline houses on legacy payloads", () => {
    assert.equal(
      resolveServerHouseCount(catalog([house("a"), house("b")], "2026-10-31T10:00:00.000Z")),
      2,
    );
  });
});

describe("catalogCacheIncomplete", () => {
  it("flags partial caches below server houseCount", () => {
    const partial = catalog(
      [house("a"), house("b"), house("c"), house("d")],
      "2026-10-31T10:00:00.000Z",
    );
    assert.equal(localCatalogHouseCount(partial), 4);
    assert.equal(catalogCacheIncomplete(partial, null, 25), true);
  });

  it("accepts a verified complete cache that matches server count", () => {
    const full = catalog(
      Array.from({ length: 25 }, (_, index) => house(`house-${index}`)),
      "2026-10-31T10:00:00.000Z",
      { houseCount: 25 },
    );
    const meta: CatalogCacheMeta = { complete: true, houseCount: 25 };
    assert.equal(catalogCacheIncomplete(full, meta, 25), false);
  });

  it("requires completeness metadata for legacy caches without server count", () => {
    const full = catalog(
      Array.from({ length: 25 }, (_, index) => house(`house-${index}`)),
      "2026-10-31T10:00:00.000Z",
    );
    assert.equal(catalogCacheIncomplete(full, null), true);
    assert.equal(catalogCacheIncomplete(full, { complete: true, houseCount: 25 }), false);
  });
});

describe("catalogNeedsFullRefresh", () => {
  it("flags small real-house caches for a full snapshot reload", () => {
    const partial = catalog(
      [house("a"), house("b"), house("c"), house("d")],
      "2026-10-31T10:00:00.000Z",
    );
    assert.equal(catalogNeedsFullRefresh(partial, null, 25), true);
  });

  it("does not force refresh for stub-only rehearsal catalogs", () => {
    const stubs = catalog(
      [house("בית-9311", { description: "סטאב לחזרה" })],
      "2026-10-31T10:00:00.000Z",
    );
    assert.equal(catalogNeedsFullRefresh(stubs), false);
  });

  it("skips full refresh when cache meta matches server houseCount", () => {
    const full = catalog(
      Array.from({ length: 25 }, (_, index) => house(`house-${index}`)),
      "2026-10-31T10:00:00.000Z",
      { houseCount: 25 },
    );
    const meta: CatalogCacheMeta = { complete: true, houseCount: 25 };
    assert.equal(catalogNeedsFullRefresh(full, meta, 25), false);
  });
});

describe("resolveCatalogHouses", { skip: !hasLocalStorage }, () => {
  beforeEach(() => {
    localStorage.removeItem(CATALOG_LS_KEY);
    localStorage.removeItem(CATALOG_META_LS_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(CATALOG_LS_KEY);
    localStorage.removeItem(CATALOG_META_LS_KEY);
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

  it("saveCatalogCache unions with the existing device cache instead of shrinking it", async () => {
    const cached = catalog(
      [
        house("a", { updatedAt: "2026-10-31T09:00:00.000Z" }),
        house("b", { updatedAt: "2026-10-31T09:00:00.000Z" }),
        house("c", { updatedAt: "2026-10-31T09:00:00.000Z" }),
      ],
      "2026-10-31T09:00:00.000Z",
    );
    localStorage.setItem(CATALOG_LS_KEY, JSON.stringify(cached));
    await saveCatalogCache(
      catalog([house("a", { updatedAt: "2026-10-31T12:00:00.000Z" })], "2026-10-31T12:00:00.000Z"),
    );
    const ids = (loadCatalogCacheSync()?.houses ?? []).map((item) => item.id).sort();
    assert.deepEqual(ids, ["a", "b", "c"]);
  });

  it("persists cache completeness metadata separately from catalog payload", () => {
    saveCatalogCacheMeta({ complete: true, houseCount: 25, verifiedAt: "2026-10-31T10:00:00.000Z" });
    assert.deepEqual(loadCatalogCacheMeta(), {
      complete: true,
      houseCount: 25,
      verifiedAt: "2026-10-31T10:00:00.000Z",
    });
  });
});
