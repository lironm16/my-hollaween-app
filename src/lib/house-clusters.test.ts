import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clusterAddressKey, clusterHousesByAddress, clusterMembersForHouse } from "@/lib/house-clusters";
import { isStubHouse } from "@/lib/house-set";
import type { PublicHouse } from "@/lib/types";

function house(id: string, address: string, patch: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id,
    name: `בית ${id}`,
    theme: "pumpkin",
    address,
    arrival: `דירה ${id}`,
    description: "בדיקה",
    lat: 32.0916477,
    lng: 34.8028691,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    openHours: [{ from: "17:00", to: "21:00" }],
    notes: "",
    accessible: false,
    visit: "come",
    decorLevel: "medium",
    decorated: true,
    soldOut: false,
    createdAt: "2026-10-31T12:00:00.000Z",
    updatedAt: "2026-10-31T12:00:00.000Z",
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    ...patch,
  };
}

describe("clusterAddressKey", () => {
  it("groups the same street number across formatting variants", () => {
    assert.equal(clusterAddressKey("חרוזים 8"), clusterAddressKey("חרוזים  8, חרוזים"));
  });
});

describe("clusterHousesByAddress", () => {
  it("groups multiple apartments at one address into a single cluster", () => {
    const clusters = clusterHousesByAddress([
      house("a", "חרוזים 8"),
      house("b", "חרוזים 8"),
      house("c", "חרוזים 10"),
    ]);
    assert.equal(clusters.length, 2);
    const building = clusters.find((cluster) => cluster.houses.length === 2);
    assert.ok(building);
    assert.equal(building.address, "חרוזים 8");
  });
});

describe("clusterMembersForHouse", () => {
  it("counts only houses in the supplied set (real mode excludes rehearsal stubs)", () => {
    const all = [
      house("r1", "חרוזים 8"),
      house("r2", "חרוזים 8"),
      house("r3", "חרוזים 8"),
      house("בית-9310", "חרוזים 8", { description: "סטאב לחזרה" }),
      house("בית-9311", "חרוזים 8", { description: "סטאב לחזרה" }),
      house("בית-9312", "חרוזים 8", { description: "סטאב לחזרה" }),
    ];
    const realOnly = all.filter((item) => !isStubHouse(item));
    assert.equal(clusterMembersForHouse(all, "r1").length, 6);
    assert.equal(clusterMembersForHouse(realOnly, "r1").length, 3);
  });
});
