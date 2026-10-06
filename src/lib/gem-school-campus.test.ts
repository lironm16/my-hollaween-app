import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gemHuntMapHouses, gemMonsterForHouse, gemMonsterTint } from "@/lib/gem-monsters";
import {
  houseMatchesGemHuntSet,
  isGemSchoolCampusBooth,
  schoolCampusDragonTint,
} from "@/lib/gem-school-campus";

describe("gem school campus", () => {
  it("recognizes school booths but not POI rows at the same address", () => {
    assert.equal(
      isGemSchoolCampusBooth({ address: "ביה״ס ניצנים", kind: "house" }),
      true,
    );
    assert.equal(
      isGemSchoolCampusBooth({ address: "ביה״ס גבעולים", kind: "poi" }),
      false,
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

  it("includes school booths in real house-set gem map", () => {
    const houses = [
      {
        id: "בית-9320",
        address: "ביה״ס ניצנים",
        kind: "house" as const,
        description: "סטאב לחזרה — דוכן",
      },
      { id: "בית-100", address: "חרוזים 1", kind: "house" as const, description: "" },
      { id: "נק-9310", kind: "poi" as const, address: "רחוב 1", description: "POI" },
    ];
    assert.equal(houseMatchesGemHuntSet(houses[0]!, "real"), true);
    assert.equal(houseMatchesGemHuntSet(houses[1]!, "real"), false);
    const eligible = gemHuntMapHouses(houses as never, "real");
    assert.deepEqual(eligible.map((h) => h.id), ["בית-9320"]);
  });
});
