import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  houseServerDetailReady,
  isDeviceCachePinHouse,
  stripHouseForDeviceCache,
  withServerHouseDetail,
} from "@/lib/device-catalog-cache";
import type { PublicHouse } from "@/lib/types";

function house(patch: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id: "a",
    name: "Test",
    theme: "pumpkin",
    address: "רחוב 1",
    arrival: "דירה 2",
    description: "ממתקים",
    notes: "הערה",
    lat: 32.09,
    lng: 34.81,
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
    photoUrl: "https://example.com/p.jpg",
    createdAt: "2026-10-31T10:00:00.000Z",
    updatedAt: "2026-10-31T10:00:00.000Z",
    ...patch,
  } as PublicHouse;
}

describe("device catalog cache", () => {
  it("strips location and story fields and marks pin rows", () => {
    const stripped = stripHouseForDeviceCache(house());
    assert.equal(stripped.address, "");
    assert.equal(stripped.arrival, "");
    assert.equal(stripped.notes, "");
    assert.equal(stripped.description, "");
    assert.equal(stripped.photoUrl, "");
    assert.equal(stripped.lat, 32.09);
    assert.equal(isDeviceCachePinHouse(stripped), true);
  });

  it("clears pin marker when merging server detail", () => {
    const full = withServerHouseDetail({ ...house(), deviceCachePin: true });
    assert.equal(isDeviceCachePinHouse(full), false);
    assert.equal(full.address, "רחוב 1");
  });

  it("blocks navigation readiness until server detail arrives", () => {
    assert.equal(houseServerDetailReady({ ...house(), deviceCachePin: true }), false);
    assert.equal(houseServerDetailReady(house()), true);
  });
});
