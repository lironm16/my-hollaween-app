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

  it("excludes residential and school houses pre-event unless includeAllHouses", () => {
    const home = {
      id: "בית-100",
      address: "חרוזים 8",
      kind: "house" as const,
      isStub: false,
    };
    const school = {
      id: "בית-200",
      address: "ביה״ס ניצנים",
      kind: "house" as const,
      isStub: false,
    };
    assert.equal(houseMatchesGemHuntSet(home, "real"), false);
    assert.equal(houseMatchesGemHuntSet(school, "real"), false);
    assert.equal(houseMatchesGemHuntSet(home, "real", { includeAllHouses: true }), true);
    assert.equal(houseMatchesGemHuntSet(school, "real", { includeAllHouses: true }), true);
  });

  it("includes practice houses pre-event on the real set", () => {
    const practice = {
      id: "תרגול-1001",
      address: "רחוב תרגול 1",
      kind: "house" as const,
      isStub: false,
      isPractice: true,
    };
    assert.equal(houseMatchesGemHuntSet(practice, "real"), true);
    assert.equal(gemMonsterForHouse(practice), "dragon");
  });

  it("assigns distinct dragon tints per school booth", () => {
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
    assert.notEqual(schoolCampusDragonTint(boothA)!.hue, schoolCampusDragonTint(boothB)!.hue);
    assert.equal(gemMonsterTint(boothA).glow, gemMonsterTint(boothB).glow);
  });

  it("does not assign school booths to pre-event gem map", () => {
    const stubBooth = {
      id: "בית-9320",
      address: "ביה״ס ניצנים",
      kind: "house" as const,
      isStub: true,
      description: "דוכן QA",
    };
    const realBooth = {
      id: "בית-9001",
      address: "ביה״ס ניצנים",
      kind: "house" as const,
      isStub: false,
      description: "דוכן אמיתי",
    };
    assert.equal(houseMatchesGemHuntSet(stubBooth, "real"), false);
    assert.equal(houseMatchesGemHuntSet(stubBooth, "stubs"), false);
    assert.equal(houseMatchesGemHuntSet(realBooth, "real"), false);
    const eligible = gemHuntMapHouses([stubBooth, realBooth] as never, "real");
    assert.deepEqual(eligible.map((h) => h.id), []);
  });
});
