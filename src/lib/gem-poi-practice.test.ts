import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gemHuntMapHouses, gemMonsterForHouse, gemMonsterTint } from "@/lib/gem-monsters";
import { isGemPracticePoi, practicePoiDragonTint } from "@/lib/gem-poi-practice";

describe("gem POI practice", () => {
  it("accepts real POIs and rejects stubs and gem lab", () => {
    assert.equal(
      isGemPracticePoi({ id: "נק-1", kind: "poi", description: "קפה בשכונה" }),
      true,
    );
    assert.equal(
      isGemPracticePoi({ id: "נק-9310", kind: "poi", description: "סטאב לחזרה — POI" }),
      false,
    );
    assert.equal(
      isGemPracticePoi({ id: "נק-9313", kind: "house", description: "יהלום בדיקה (מעבדת מנהל)" }),
      false,
    );
  });

  it("maps practice POIs to dragon with neighborhood tint", () => {
    const poi = {
      id: "נק-school",
      kind: "poi" as const,
      description: "בית ספר",
      neighborhood: "הגפן" as const,
      theme: "pumpkin" as const,
    };
    assert.equal(gemMonsterForHouse(poi), "dragon");
    const tint = practicePoiDragonTint(poi);
    assert.ok(tint);
    assert.ok(tint!.glow > 0);
    assert.notEqual(gemMonsterTint(poi).hue, gemMonsterTint("random-house").hue);
  });

  it("gem hunt map houses are POI-only", () => {
    const houses = [
      { id: "בית-1", kind: "house" as const, description: "real house" },
      { id: "נק-1", kind: "poi" as const, description: "school gate" },
      { id: "נק-9310", kind: "poi" as const, description: "סטאב לחזרה" },
    ];
    const eligible = gemHuntMapHouses(houses as never, "real");
    assert.deepEqual(eligible.map((h) => h.id), ["נק-1"]);
  });
});
