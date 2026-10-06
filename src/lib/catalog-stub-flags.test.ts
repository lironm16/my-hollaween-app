import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySnapshotStubFlags,
  mergeCatalogHouseRow,
  mergePublicHouseStubFields,
} from "@/lib/catalog-stub-flags";
import { catalogHasExplicitStubFlags } from "@/lib/house-set";
import type { Catalog, PublicHouse } from "@/lib/types";

function house(id: string, patch: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id,
    name: id,
    theme: "pumpkin",
    address: "",
    arrival: "",
    description: "",
    lat: 32.09,
    lng: 34.8,
    treats: [],
    treatStock: {},
    visit: "come",
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    accessible: false,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
    ...patch,
  } as PublicHouse;
}

describe("catalog stub flags", () => {
  it("keeps stub classification when a live delta omits isStub", () => {
    const cached = house("בית-9310", { isStub: true, deviceCachePin: true, deviceCacheStub: true });
    const live = house("בית-9310", {
      updatedAt: "2026-10-31T12:00:00.000Z",
      address: "חרוזים 8",
    });
    const merged = mergeCatalogHouseRow(cached, live);
    assert.equal(merged.isStub, true);
    assert.equal(merged.address, "חרוזים 8");
  });

  it("marks explicit real rows after device cache strip", () => {
    const merged = mergePublicHouseStubFields(
      house("real-1", { isStub: false, deviceCachePin: true }),
      house("real-1", { isStub: false }),
    );
    assert.equal(merged.isStub, false);
    assert.equal(merged.deviceCacheStub, undefined);
  });

  it("repairs ambiguous cache rows from snapshot isStub", () => {
    const device: Catalog = {
      updatedAt: "2026-09-06T19:50:00.000Z",
      neighborhood: "n",
      houses: [
        house("בית-1847", { deviceCachePin: true }),
        house("real-1", { isStub: false, deviceCachePin: true }),
      ],
    };
    const snapshot: Catalog = {
      updatedAt: "2026-09-06T19:50:00.000Z",
      neighborhood: "n",
      houses: [
        house("בית-1847", { isStub: true }),
        house("real-1", { isStub: false }),
      ],
    };
    const repaired = applySnapshotStubFlags(device, snapshot);
    assert.equal(repaired.houses[0]?.isStub, true);
    assert.equal(repaired.houses[1]?.isStub, false);
    assert.equal(catalogHasExplicitStubFlags(repaired), true);
  });
});
