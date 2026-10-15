import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  firstClusterGemHouseInProximity,
  pickMapFabGemHuntTarget,
  pickMapRovingGemHuntHouse,
} from "@/lib/map-gem-hunt-target";
import type { PublicHouse } from "@/lib/types";

function house(id: string, lat: number, lng: number): PublicHouse {
  return {
    id,
    lat,
    lng,
    name: id,
    address: "test",
    arrival: "",
    neighborhood: "n",
    active: true,
  } as unknown as PublicHouse;
}

describe("map gem hunt target", () => {
  it("returns an uncollected cluster booth when user is in hunt band", () => {
    const a = house("a", 32.08, 34.78);
    const b = house("b", 32.08001, 34.78001);
    const members = [a, b];
    const user = { lat: 32.08, lng: 34.78, accuracy: 5 };
    const picked = firstClusterGemHouseInProximity(members, user, () => false);
    assert.ok(picked?.id === "a" || picked?.id === "b");
  });

  it("pins roving hunt while tell-me / hint target is locked", () => {
    const near = house("near", 32.08, 34.78);
    const far = house("far", 32.09, 34.79);
    const user = { lat: 32.08, lng: 34.78, accuracy: 5 };
    const pool = [near, far];
    const roving = pickMapRovingGemHuntHouse(user, pool, pool, () => false, null, "far");
    assert.equal(roving?.id, "near");
    const pinned = pickMapRovingGemHuntHouse(user, pool, pool, () => false, "far", "near");
    assert.equal(pinned?.id, "far");
  });

  it("pickMapFabGemHuntTarget returns null when all collected", () => {
    const h = house("h", 32.08, 34.78);
    assert.equal(
      pickMapFabGemHuntTarget({ lat: 32.08, lng: 34.78 }, [h], [h], () => true),
      null,
    );
  });
});
