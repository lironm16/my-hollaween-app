import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GEM_MONSTER_MODELS,
  gemFamilyForHouse,
  gemLabelHe,
  gemMonsterForHouse,
  gemMonsterTint,
  gemVariantForHouse,
} from "@/lib/gem-monsters";

describe("gem monsters (Akochan pets)", () => {
  it("assigns a stable pet per house id", () => {
    const house = { id: "house-abc", theme: "ghost" as const, kind: "house" as const };
    const first = gemMonsterForHouse(house);
    assert.ok(GEM_MONSTER_MODELS.some((m) => m.id === first));
    assert.equal(gemMonsterForHouse(house), first);
    assert.equal(gemVariantForHouse(house), first);
    assert.equal(gemFamilyForHouse(house), "monster");
  });

  it("includes POIs in the gem pool", () => {
    const poi = { id: "poi-cafe", theme: "candy" as const, kind: "poi" as const };
    assert.ok(GEM_MONSTER_MODELS.some((m) => m.id === gemMonsterForHouse(poi)));
  });

  it("labels pets in Hebrew", () => {
    assert.equal(gemLabelHe("pumpkin"), "דלעת");
    assert.equal(gemLabelHe("unknown-id"), GEM_MONSTER_MODELS[0]!.labelHe);
  });

  it("tints by house id", () => {
    const a = gemMonsterTint("house-a");
    const b = gemMonsterTint("house-b");
    assert.ok(a.hue >= 0 && a.hue <= 1);
    assert.notEqual(a.hue, b.hue);
  });
});
