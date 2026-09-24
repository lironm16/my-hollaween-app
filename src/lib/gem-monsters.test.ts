import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gemFamilyForHouse,
  gemMonsterForHouse,
  gemMonsterTint,
  gemVariantForHouse,
} from "@/lib/gem-monsters";

describe("gem monsters (Molotov MVP)", () => {
  it("uses dragon for every house", () => {
    const house = { id: "house-abc", theme: "ghost" as const, kind: "house" as const };
    assert.equal(gemMonsterForHouse(house), "dragon");
    assert.equal(gemVariantForHouse(house), "dragon");
    assert.equal(gemFamilyForHouse(house), "monster");
  });

  it("includes POIs in the gem pool", () => {
    const poi = { id: "poi-cafe", theme: "candy" as const, kind: "poi" as const };
    assert.equal(gemMonsterForHouse(poi), "dragon");
  });

  it("tints by house id", () => {
    const a = gemMonsterTint("house-a");
    const b = gemMonsterTint("house-b");
    assert.ok(a.hue >= 0 && a.hue <= 1);
    assert.notEqual(a.hue, b.hue);
  });
});
