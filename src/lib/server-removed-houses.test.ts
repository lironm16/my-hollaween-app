import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { Catalog, CatalogDelta, PublicHouse } from "@/lib/types";
import { mergeCatalogDelta, syncCatalog } from "@/lib/catalog-sync";
import { withDeviceHouseOverlays } from "@/lib/offline-db";
import {
  loadServerRemovedHouseIds,
  recordLiveCatalogRemovals,
} from "@/lib/server-removed-houses";

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

const T0 = "2026-10-31T09:00:00.000Z";

function row(id: string, updatedAt = T0): PublicHouse {
  return { id, name: id, lat: 32.09, lng: 34.81, updatedAt } as PublicHouse;
}

function catalog(updatedAt: string, ids: string[], houseCount = ids.length): Catalog {
  return { updatedAt, neighborhood: "n", houses: ids.map((id) => row(id)), houseCount };
}

function ids(value: Catalog) {
  return value.houses.map((house) => house.id).sort();
}

function liveDelta(patch: Partial<CatalogDelta>): CatalogDelta {
  return {
    updatedAt: "2026-10-31T11:00:00.000Z",
    neighborhood: "n",
    houses: [],
    ...patch,
  };
}

describe("server-confirmed deletions on other devices", () => {
  it("survive the device-cache merge after a delta poll", () => {
    const cache = catalog("2026-10-31T10:00:00.000Z", ["a", "b", "x"]);
    const delta = liveDelta({ removed: ["x"], houseCount: 2 });
    recordLiveCatalogRemovals(delta);
    const shown = mergeCatalogDelta(cache, delta);
    assert.deepEqual(ids(shown), ["a", "b"]);
    const saved = syncCatalog(cache, shown);
    assert.deepEqual(ids(saved), ["a", "b"]);
  });

  it("stay hidden when the stale cache is reconciled or reloaded on restart", () => {
    recordLiveCatalogRemovals(liveDelta({ removed: ["x"] }));
    const staleCache = catalog("2026-10-31T10:00:00.000Z", ["a", "b", "x"]);
    const shown = catalog("2026-10-31T11:00:00.000Z", ["a", "b"]);
    assert.deepEqual(ids(syncCatalog(staleCache, shown)), ["a", "b"]);
    assert.deepEqual(ids(withDeviceHouseOverlays(staleCache)), ["a", "b"]);
  });

  it("stay hidden when an older CDN snapshot still lists the house", () => {
    recordLiveCatalogRemovals(liveDelta({ removed: ["x"] }));
    const shown = catalog("2026-10-31T11:00:00.000Z", ["a", "b"]);
    const snapshot = catalog("2026-10-31T08:00:00.000Z", ["a", "b", "x"]);
    assert.deepEqual(ids(syncCatalog(shown, snapshot)), ["a", "b"]);
  });

  it("come back when the live server lists the house again (restore)", () => {
    recordLiveCatalogRemovals(liveDelta({ removed: ["x"] }));
    const restored = liveDelta({ houses: [row("x", "2026-10-31T12:00:00.000Z")], houseCount: 3 });
    recordLiveCatalogRemovals(restored);
    assert.deepEqual(loadServerRemovedHouseIds(), []);
    const shown = mergeCatalogDelta(catalog("2026-10-31T11:00:00.000Z", ["a", "b"]), restored);
    assert.deepEqual(ids(shown), ["a", "b", "x"]);
  });
});

describe("short or partial lists still never drop houses", () => {
  it("a partial list with a matching count does not drop local houses", () => {
    const shown = catalog("2026-10-31T10:00:00.000Z", ["a", "b", "c", "d", "e", "f", "g", "h"]);
    const partial = catalog("2026-10-31T11:00:00.000Z", ["a", "b"], 2);
    assert.equal(syncCatalog(shown, partial).houses.length, 8);
  });

  it("a live delta that simply omits a house does not hide it", () => {
    const delta = liveDelta({ houses: [row("a", "2026-10-31T10:30:00.000Z")], houseCount: 3 });
    recordLiveCatalogRemovals(delta);
    assert.deepEqual(loadServerRemovedHouseIds(), []);
    const shown = mergeCatalogDelta(catalog("2026-10-31T10:00:00.000Z", ["a", "b", "c"]), delta);
    assert.deepEqual(ids(shown), ["a", "b", "c"]);
  });
});
