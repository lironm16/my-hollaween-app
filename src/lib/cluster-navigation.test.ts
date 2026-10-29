import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clusterMapsNavigationHouse } from "@/lib/cluster-navigation";
import type { PublicHouse } from "@/lib/types";

const house = (id: string, address: string): PublicHouse =>
  ({
    id,
    name: id,
    address,
    lat: 32,
    lng: 34,
    updatedAt: "2026-01-01T00:00:00.000Z",
  }) as PublicHouse;

describe("clusterMapsNavigationHouse", () => {
  it("picks the first member with address, maps allowed, and detail ready", () => {
    const a = house("a", "");
    const b = house("b", "חרוזים 8");
    const c = house("c", "חרוזים 8");
    const picked = clusterMapsNavigationHouse(
      [a, b, c],
      (id) => id === "b" || id === "c",
      () => true,
    );
    assert.equal(picked?.id, "b");
  });

  it("returns null when no member qualifies", () => {
    const picked = clusterMapsNavigationHouse([house("a", "x")], () => false, () => true);
    assert.equal(picked, null);
  });
});
