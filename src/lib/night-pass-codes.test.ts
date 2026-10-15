import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HOUSE_ACCESS_CODE_LENGTH,
  maskPhone,
  normalizeHolderName,
  normalizeIsraeliMobile,
  normalizeNightPassCode,
} from "@/lib/house-access-code";
import { newHouseAccessCode } from "@/lib/night-pass-codes";

describe("night pass codes", () => {
  it("generates 4-char family codes from the unambiguous alphabet", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = newHouseAccessCode();
      assert.equal(code.length, HOUSE_ACCESS_CODE_LENGTH);
      assert.match(code, /^[A-HJKMNP-Z2-9]{4}$/);
      assert.equal(normalizeNightPassCode(code), code);
    }
  });

  it("accepts lowercase and strips spaces", () => {
    assert.equal(normalizeNightPassCode(" k7qm "), "K7QM");
  });

  it("rejects wrong length and ambiguous characters", () => {
    assert.equal(normalizeNightPassCode("K7Q"), null);
    assert.equal(normalizeNightPassCode("K7QM3XPA"), null);
    assert.equal(normalizeNightPassCode("K7QI"), null);
    assert.equal(normalizeNightPassCode(42), null);
  });

  it("normalizes Israeli mobiles", () => {
    assert.equal(normalizeIsraeliMobile("050-123-4567"), "0501234567");
    assert.equal(normalizeIsraeliMobile("+972 50 123 4567"), "0501234567");
    assert.equal(normalizeIsraeliMobile("03-1234567"), null);
    assert.equal(normalizeIsraeliMobile("050123"), null);
    assert.equal(maskPhone("0501234567"), "050-•••-4567");
  });

  it("validates holder names", () => {
    assert.equal(normalizeHolderName("  דנה   כהן "), "דנה כהן");
    assert.equal(normalizeHolderName("ד"), null);
    assert.equal(normalizeHolderName("א".repeat(41)), null);
  });
});
