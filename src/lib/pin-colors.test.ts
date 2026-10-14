import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PIN_BACKGROUND,
  PIN_GHOST_PURPLE,
  PIN_PUMPKIN_ORANGE,
  pinBackgroundFill,
} from "@/lib/pin-colors";

describe("pinBackgroundFill", () => {
  it("uses white disc fills for decorated houses and POIs", () => {
    assert.equal(pinBackgroundFill({}, true), PIN_BACKGROUND.house.decorated);
    assert.equal(pinBackgroundFill({ kind: "poi" }, true), PIN_BACKGROUND.poi.decorated);
  });

  it("keeps brand glyph colors as the former pin disc fills", () => {
    assert.equal(PIN_GHOST_PURPLE, "#6d28d9");
    assert.equal(PIN_PUMPKIN_ORANGE, "#f97316");
  });

  it("avoids candy and scare badge hex values", () => {
    const avoid = new Set(["#047857", "#d97706", "#b91c1c"]);
    for (const palette of Object.values(PIN_BACKGROUND)) {
      assert.equal(avoid.has(palette.decorated), false);
      assert.equal(avoid.has(palette.undecorated), false);
    }
  });
});
