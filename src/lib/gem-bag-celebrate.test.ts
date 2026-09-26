import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gemBagCelebrateAfterCollect, gemBagCollectHref } from "@/lib/gem-bag-celebrate";
import { gemMonsterForHouse, syncGemMonsterAssignment } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";

function house(id: string): PublicHouse {
  return {
    id,
    name: id,
    theme: "pumpkin",
    address: "חרוזים 8",
    lat: 32.09,
    lng: 34.81,
    treats: ["candy"],
    scareLevel: "mild",
    visit: "come",
  } as PublicHouse;
}

describe("gem bag celebrate", () => {
  it("detects map complete on last house", () => {
    const map = [house("a"), house("b")];
    syncGemMonsterAssignment(map);
    const gemA = gemMonsterForHouse(map[0]!);
    const gemB = gemMonsterForHouse(map[1]!);
    const kind = gemBagCelebrateAfterCollect(
      map,
      [{ houseId: "a", gemType: gemA, collectedAt: 1 }],
      "b",
      gemB,
    );
    assert.equal(kind, "map");
  });

  it("builds href with celebrate query", () => {
    assert.equal(gemBagCollectHref("dragon", "album"), "/gem-bag?fly=dragon&celebrate=album");
  });
});
