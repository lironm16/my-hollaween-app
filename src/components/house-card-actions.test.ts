import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { houseCardPropsFor, type HouseCardActionContext } from "@/components/house-card-actions";
import { noteCatalogRemovals } from "@/lib/catalog-removed";
import type { PublicHouse } from "@/lib/types";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  (globalThis as { window?: Window }).window = {
    dispatchEvent: () => true,
  } as unknown as Window;
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
});

const house = {
  id: "removed-1",
  name: "בית",
  address: "רחוב",
  lat: 32,
  lng: 34,
  updatedAt: "2026-10-10T00:00:00.000Z",
} as PublicHouse;

const ctx: HouseCardActionContext = {
  liked: () => false,
  visited: () => false,
  onToggleLike: () => {},
  onToggleVisited: () => {},
  onToggleGem: () => {},
  onShowOnMap: () => {},
  onShowInList: () => {},
  onSkip: () => {},
  skipped: () => false,
  canEdit: () => true,
};

describe("houseCardPropsFor", () => {
  it("hides gem quick action when gemQuickActionEligible returns false", () => {
    const props = houseCardPropsFor(house, {
      ...ctx,
      gemQuickActionEligible: () => false,
    });
    assert.equal(props.onToggleGem, undefined);
  });

  it("offers **מיקום השדון** only on houses this device may edit", () => {
    const owner = houseCardPropsFor({ ...house, id: "owned-1" }, { ...ctx, onPlaceGem: () => {} });
    assert.equal(typeof owner.onPlaceGem, "function");
    const visitor = houseCardPropsFor(
      { ...house, id: "other-1" },
      { ...ctx, canEdit: () => false, onPlaceGem: () => {} },
    );
    assert.equal(visitor.onPlaceGem, undefined);
  });

  it("strips map and personal marks when the house was removed from the catalog", () => {
    noteCatalogRemovals(["removed-1"], "2026-10-10T12:00:00.000Z");
    const props = houseCardPropsFor(house, ctx);
    assert.equal(props.onToggleLike, undefined);
    assert.equal(props.onToggleVisited, undefined);
    assert.equal(props.onToggleGem, undefined);
    assert.equal(props.onShowOnMap, undefined);
    assert.equal(props.onShowInList, undefined);
    assert.equal(props.onSkip, undefined);
    assert.equal(props.canEdit, false);
  });
});
