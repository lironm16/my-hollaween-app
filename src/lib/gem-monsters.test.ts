import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { distanceMeters } from "@/lib/geo";
import {
  GEM_MONSTER_CATALOG,
  GEM_MONSTER_MODELS,
  GEM_MONSTERS_DRAGON_ONLY,
  GEM_REPEAT_MIN_SPACING_M,
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
      lat: 32.09 + i * 0.003,
      lng: 34.8 + i * 0.003,
    }));
    const assignment = buildGemMonsterAssignment(houses);
    const onMap = new Set(assignment.values());
    assert.equal(onMap.size, poolLen);
    for (const model of GEM_MONSTER_MODELS) {
      assert.ok(onMap.has(model.id), model.id);
    }
  });

  it("spreads duplicate pets across distance (frankie / spider not clustered)", () => {
    if (GEM_MONSTERS_DRAGON_ONLY) return;
    const clusters = [
      { lat: 32.0916, lng: 34.8028 },
      { lat: 32.0939, lng: 34.8133 },
      { lat: 32.093, lng: 34.8186 },
    ];
    const houses = Array.from({ length: 28 }, (_, i) => ({
      id: `spread-${String(i).padStart(2, "0")}`,
      theme: "ghost" as const,
      kind: "house" as const,
      lat: clusters[i % clusters.length]!.lat + (i % 3) * 0.00005,
      lng: clusters[i % clusters.length]!.lng + (i % 5) * 0.00004,
    }));
    const assignment = buildGemMonsterAssignment(houses);
    for (const monsterId of ["frankie", "spider"] as const) {
      const pts = houses
        .filter((h) => assignment.get(h.id) === monsterId)
        .map((h) => ({ lat: h.lat!, lng: h.lng! }));
      if (pts.length < 2) continue;
      let minPair = Infinity;
      for (let i = 0; i < pts.length; i += 1) {
        for (let j = i + 1; j < pts.length; j += 1) {
          minPair = Math.min(minPair, distanceMeters(pts[i]!, pts[j]!));
        }
      }
      assert.ok(
        minPair >= GEM_REPEAT_MIN_SPACING_M * 0.45,
        `${monsterId} min pair ${minPair.toFixed(0)}m`,
      );
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
