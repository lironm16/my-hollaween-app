import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogShortfall,
  CATALOG_FULL_RECOVERY_MIN_GAP,
  shouldFetchFullCatalogAfterCheapRecovery,
} from "@/lib/catalog-recovery";
import type { Catalog } from "@/lib/types";

function catalog(houseCount: number, inline = houseCount): Catalog {
  return {
    updatedAt: "2026-10-31T12:00:00.000Z",
    neighborhood: "test",
    houses: Array.from({ length: inline }, (_, i) => ({
      id: `h-${i}`,
      name: "x",
      theme: "pumpkin",
      address: "a",
      arrival: "",
      description: "",
      lat: 32,
      lng: 34,
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
      createdAt: "2026-10-31T12:00:00.000Z",
      updatedAt: "2026-10-31T12:00:00.000Z",
    })),
    houseCount,
  };
}

describe("catalogShortfall", () => {
  it("returns missing count vs server houseCount", () => {
    assert.equal(catalogShortfall(catalog(87, 87), 88), 1);
    assert.equal(catalogShortfall(catalog(88, 88), 88), 0);
  });
});

describe("shouldFetchFullCatalogAfterCheapRecovery", () => {
  it("skips full fetch for a single missing house", () => {
    assert.equal(shouldFetchFullCatalogAfterCheapRecovery(88, 87), false);
  });

  it("requests full fetch for large absolute gaps", () => {
    assert.equal(
      shouldFetchFullCatalogAfterCheapRecovery(88, 88 - CATALOG_FULL_RECOVERY_MIN_GAP),
      true,
    );
  });

  it("requests full fetch for large relative gaps", () => {
    assert.equal(shouldFetchFullCatalogAfterCheapRecovery(50, 40), true);
  });
});
