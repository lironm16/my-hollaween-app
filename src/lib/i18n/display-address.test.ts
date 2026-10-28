import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { localizedFormatDisplayAddress } from "@/lib/i18n/display-address";

describe("localizedFormatDisplayAddress", () => {
  it("English campus labels tolerate quote variants in stored address", () => {
    assert.equal(
      localizedFormatDisplayAddress("en", {
        address: 'ביה"ס ניצנים',
        neighborhood: "שיכון ותיקים",
      }),
      "Nitzanim School, Shikun Vatikim",
    );
  });
});
