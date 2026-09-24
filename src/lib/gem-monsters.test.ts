import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GEM_MONSTER_CATALOG,
  GEM_MONSTER_MODELS,
  GEM_MONSTERS_DRAGON_ONLY,
  gemFamilyForHouse,
  gemLabelHe,
  gemMonsterForHouse,
  gemMonsterTint,
  gemVariantForHouse,
} from "@/lib/gem-monsters";

describe("gem monsters", () => {
  it("catalog lists all pets; runtime pool follows shipped GLBs manifest", () => {
    assert.equal(GEM_MONSTER_CATALOG.length, 19);
    assert.ok(GEM_MONSTER_MODELS.length >= 1);
    if (GEM_MONSTERS_DRAGON_ONLY) {
      assert.equal(GEM_MONSTER_MODELS.length, 1);
    } else {
      assert.ok(GEM_MONSTER_MODELS.length > 1);
    }
  });

  it("assigns dragon for every house while in dragon-only mode", () => {
    const house = { id: "house-abc", theme: "ghost" as const, kind: "house" as const };
    assert.equal(gemMonsterForHouse(house), "dragon");
    assert.equal(gemVariantForHouse(house), "dragon");
    assert.equal(gemFamilyForHouse(house), "monster");
    const other = { id: "house-xyz", theme: "vampire" as const, kind: "house" as const };
    assert.equal(gemMonsterForHouse(other), "dragon");
  });

  it("labels pets with cute Hebrew names", () => {
    assert.equal(gemLabelHe("dragon"), "דרקי הדרקון");
    assert.equal(gemLabelHe("spider"), "עכי העכביש");
    assert.equal(gemLabelHe("mummy"), "מומו המומיה");
    assert.equal(gemLabelHe("unknown-id"), "דרקי הדרקון");
  });

  it("tints by house id", () => {
    const a = gemMonsterTint("house-a");
    const b = gemMonsterTint("house-b");
    assert.ok(a.hue >= 0 && a.hue <= 1);
    assert.notEqual(a.hue, b.hue);
  });
});
