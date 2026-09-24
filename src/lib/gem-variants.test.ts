import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gemFamilyForHouse, gemVariantForHouse } from "@/lib/gem-variants";

describe("gem variants", () => {
  it("assigns a stable variant per house id", () => {
    const house = { id: "house-abc", theme: "ghost" as const, kind: "house" as const };
    const a = gemVariantForHouse(house);
    const b = gemVariantForHouse(house);
    assert.equal(a, b);
    assert.match(gemFamilyForHouse(house), /ghost|bat|skull/);
  });

  it("includes POIs in the gem pool", () => {
    const poi = { id: "poi-cafe", theme: "candy" as const, kind: "poi" as const };
    const variant = gemVariantForHouse(poi);
    assert.ok(variant.length > 0);
  });

  it("spreads variants across different ids", () => {
    const ids = ["a1", "b2", "c3", "d4", "e5", "f6"];
    const variants = new Set(
      ids.map((id) =>
        gemVariantForHouse({ id, theme: "pumpkin", kind: "house" }),
      ),
    );
    assert.ok(variants.size >= 2);
  });
});
