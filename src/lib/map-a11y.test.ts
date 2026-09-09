import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { houseSelectionAnnouncement } from "@/lib/map-a11y";
import type { PublicHouse } from "@/lib/types";

describe("houseSelectionAnnouncement", () => {
  it("includes name, address, and visit state", () => {
    const house = {
      id: "a",
      name: "בית הדלעת",
      address: "חרוזים 1",
      visit: "come",
    } as PublicHouse;
    const text = houseSelectionAnnouncement(house);
    assert.match(text, /בית הדלעת/);
    assert.match(text, /חרוזים/);
    assert.match(text, /בואו/);
  });
});
