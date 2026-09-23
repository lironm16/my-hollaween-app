import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PIN_BACKGROUND, pinBackgroundFill } from "@/lib/pin-colors";

describe("pinBackgroundFill", () => {
  it("uses purple for decorated houses and orange for POIs", () => {
    assert.equal(pinBackgroundFill({}, true), PIN_BACKGROUND.house.decorated);
    assert.equal(pinBackgroundFill({ kind: "poi" }, true), PIN_BACKGROUND.poi.decorated);
  });

  it("avoids candy and scare badge hex values", () => {
    const avoid = new Set(["#047857", "#d97706", "#b91c1c"]);
    for (const palette of Object.values(PIN_BACKGROUND)) {
      assert.equal(avoid.has(palette.decorated), false);
      assert.equal(avoid.has(palette.undecorated), false);
    }
  });
});
