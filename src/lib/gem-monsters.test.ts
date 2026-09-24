import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GEM_MONSTER_CATALOG,
  GEM_MONSTER_MODELS,
  GEM_MONSTERS_DRAGON_ONLY,
  buildGemMonsterAssignment,
  gemAlbumMonstersForMap,
  gemAlbumStickerPool,
  gemFamilyForHouse,
  gemLabelHe,
  gemMonsterForHouse,
  gemMonsterTint,
  isGemAlbumMonsterCollected,
  gemVariantForHouse,
  syncGemMonsterAssignment,
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

  it("album lists every shipped sticker, not hash-unique subset", () => {
    const album = gemAlbumMonstersForMap([]);
    assert.deepEqual(
      album.map((m) => m.id),
      gemAlbumStickerPool().map((m) => m.id),
    );
  });

  it("assignment places every shipped model on the map when enough houses", () => {
    if (GEM_MONSTERS_DRAGON_ONLY) return;
    const poolLen = GEM_MONSTER_MODELS.length;
    const houses = Array.from({ length: poolLen }, (_, i) => ({
      id: `house-${String(i).padStart(3, "0")}`,
      theme: "ghost" as const,
      kind: "house" as const,
    }));
    const assignment = buildGemMonsterAssignment(houses);
    const onMap = new Set(assignment.values());
    assert.equal(onMap.size, poolLen);
    for (const model of GEM_MONSTER_MODELS) {
      assert.ok(onMap.has(model.id), model.id);
    }
  });

  it("album stamp collected by house or gemType", () => {
    const house = {
      id: "house-x",
      theme: "ghost" as const,
      kind: "house" as const,
      lat: 0,
      lng: 0,
      address: "x",
    };
    syncGemMonsterAssignment([house]);
    const monster = gemMonsterForHouse(house);
    const map = new Map([[house.id, house]]);
    assert.equal(
      isGemAlbumMonsterCollected(monster, [{ houseId: house.id, gemType: monster, collectedAt: 1 }], map),
      true,
    );
  });
});
