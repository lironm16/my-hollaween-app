import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogShortfall,
  shouldFetchFullCatalogAfterCheapRecovery,
  shouldUseSteadyDeltaPoll,
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
  it("uses full fetch when local list is empty but server has houses", () => {
    assert.equal(shouldFetchFullCatalogAfterCheapRecovery(88, 0), true);
  });

  it("uses full fetch when server houseCount is stale below local", () => {
    assert.equal(shouldFetchFullCatalogAfterCheapRecovery(2, 35), true);
  });

  it("uses full fetch for any shortfall vs server houseCount", () => {
    assert.equal(shouldFetchFullCatalogAfterCheapRecovery(88, 87), true);
    assert.equal(shouldFetchFullCatalogAfterCheapRecovery(90, 85), true);
  });

  it("skips full fetch when local count matches server", () => {
    assert.equal(shouldFetchFullCatalogAfterCheapRecovery(88, 88), false);
  });
});

describe("shouldUseSteadyDeltaPoll", () => {
  it("blocks delta polls while the catalog is empty", () => {
    assert.equal(
      shouldUseSteadyDeltaPoll({
        localCount: 0,
        since: "2026-10-31T12:00:00.000Z",
        needsFullRefresh: false,
        serverCount: 88,
      }),
      false,
    );
  });

  it("blocks delta polls while count is below server houseCount", () => {
    assert.equal(
      shouldUseSteadyDeltaPoll({
        localCount: 5,
        since: "2026-10-31T12:00:00.000Z",
        needsFullRefresh: false,
        serverCount: 88,
      }),
      false,
    );
  });

  it("allows delta polls only when local count matches server", () => {
    assert.equal(
      shouldUseSteadyDeltaPoll({
        localCount: 88,
        since: "2026-10-31T12:00:00.000Z",
        needsFullRefresh: false,
        serverCount: 88,
      }),
      true,
    );
  });

  it("blocks delta polls when server count is unknown and cache is not marked complete", () => {
    assert.equal(
      shouldUseSteadyDeltaPoll({
        localCount: 40,
        since: "2026-10-31T12:00:00.000Z",
        needsFullRefresh: false,
        serverCount: null,
        cacheMarkedComplete: false,
      }),
      false,
    );
  });
});
