import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gemHuntMapHouses, gemMonsterForHouse, gemMonsterTint } from "@/lib/gem-monsters";
import {
  houseMatchesGemHuntSet,
  isGemSchoolCampusBooth,
  schoolCampusDragonTint,
} from "@/lib/gem-school-campus";

describe("gem school campus", () => {
  it("recognizes school campus houses and POI דוכנים", () => {
    assert.equal(
      isGemSchoolCampusBooth({ address: "ביה״ס ניצנים", kind: "house" }),
      true,
    );
    assert.equal(
      isGemSchoolCampusBooth({ address: "ביה״ס גבעולים", kind: "poi" }),
      true,
    );
    assert.equal(isGemSchoolCampusBooth({ address: "חרוזים 8", kind: "house" }), false);
  });

  it("assigns dragon with distinct booth tints", () => {
    const boothA = {
      id: "בית-9323",
      address: "ביה״ס המנחיל",
      kind: "house" as const,
      boothNumber: 1,
    };
    const boothB = {
      id: "בית-9324",
      address: "ביה״ס המנחיל",
      kind: "house" as const,
      boothNumber: 2,
    };
    assert.equal(gemMonsterForHouse(boothA), "dragon");
    assert.notEqual(schoolCampusDragonTint(boothA)!.hue, schoolCampusDragonTint(boothB)!.hue);
    assert.equal(gemMonsterTint(boothA).glow, gemMonsterTint(boothB).glow);
  });

  it("respects stub vs real house-set for school gem map", () => {
    const stubBooth = {
      id: "בית-9320",
      address: "ביה״ס ניצנים",
      kind: "house" as const,
      description: "סטאב לחזרה — דוכן",
      photoUrl: "/images/stubs/pumpkin-porch.jpg",
    };
    const realBooth = {
      id: "בית-9001",
      address: "ביה״ס ניצנים",
      kind: "house" as const,
      description: "דוכן אמיתי",
      photoUrl: "/images/houses/example.jpg",
    };
    assert.equal(houseMatchesGemHuntSet(stubBooth, "real"), false);
    assert.equal(houseMatchesGemHuntSet(stubBooth, "stubs"), true);
    assert.equal(houseMatchesGemHuntSet(realBooth, "real"), true);
    const eligible = gemHuntMapHouses([stubBooth, realBooth] as never, "stubs");
    assert.deepEqual(eligible.map((h) => h.id), ["בית-9320"]);
  });
});
