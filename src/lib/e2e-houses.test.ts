import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { E2E_HOUSE_ADDRESS, isE2eTestHouse } from "@/lib/e2e-houses";
import { isStubHouse } from "@/lib/house-set";

describe("isE2eTestHouse", () => {
  it("matches E2E names, descriptions, and the isolated test address", () => {
    assert.equal(isE2eTestHouse({ name: "בית batch5", description: "x" }), true);
    assert.equal(
      isE2eTestHouse({ name: "בית בדיקה — עדכון מהיר", description: "בדיקת E2E" }),
      true,
    );
    assert.equal(
      isE2eTestHouse({ name: "בית אמיתי", address: E2E_HOUSE_ADDRESS }),
      true,
    );
    assert.equal(isE2eTestHouse({ name: "בית משפחת לוי", description: "בית אמיתי" }), false);
  });

  it("treats E2E houses as stubs for house-set filtering", () => {
    assert.equal(
      isStubHouse({ name: "בית batch5", description: "בדיקת E2E — לא בית אמיתי" }),
      true,
    );
  });
});
