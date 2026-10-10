import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatNightPassCode,
  maskPhone,
  newNightPassCode,
  normalizeHolderName,
  normalizeIsraeliMobile,
  normalizeNightPassCode,
} from "@/lib/night-pass-codes";

describe("night pass codes", () => {
  it("generates 8-char codes from the unambiguous alphabet", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = newNightPassCode();
      assert.match(code, /^[A-HJKMNP-Z2-9]{8}$/);
      assert.equal(normalizeNightPassCode(code), code);
    }
  });

  it("accepts lowercase, dashes and spaces", () => {
    assert.equal(normalizeNightPassCode("k7qm-3xpa"), "K7QM3XPA");
    assert.equal(normalizeNightPassCode(" K7QM 3XPA "), "K7QM3XPA");
    assert.equal(formatNightPassCode("K7QM3XPA"), "K7QM-3XPA");
  });

  it("rejects wrong length and ambiguous characters", () => {
    assert.equal(normalizeNightPassCode("K7QM3XP"), null);
    assert.equal(normalizeNightPassCode("K7QM3XP0"), null);
    assert.equal(normalizeNightPassCode("K7QM3XPI"), null);
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
