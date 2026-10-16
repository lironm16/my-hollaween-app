import assert from "node:assert/strict";
import test from "node:test";
import {
  houseEditCodesMatch,
  normalizeHouseAccessCode,
  editCodeSpecForDisplay,
} from "@/lib/house-access-code";

test("normalizeHouseAccessCode accepts 6-digit and legacy 4-letter codes", () => {
  assert.equal(normalizeHouseAccessCode("953 080"), "953080");
  assert.equal(normalizeHouseAccessCode("953080"), "953080");
  assert.equal(normalizeHouseAccessCode("k7qm"), "K7QM");
  assert.equal(normalizeHouseAccessCode("12345"), null);
});

test("houseEditCodesMatch entrance and legacy stored codes", () => {
  assert.equal(houseEditCodesMatch("953080", "953080"), true);
  assert.equal(houseEditCodesMatch("K7QM", "K7QM"), true);
  assert.equal(houseEditCodesMatch("953080", "K7QM"), false);
});

test("editCodeSpecForDisplay follows stored code shape", () => {
  assert.equal(editCodeSpecForDisplay("953080").labelSuffix, "6 ספרות");
  assert.equal(editCodeSpecForDisplay("K7QM").labelSuffix, "4 תווים (ישן)");
  assert.equal(editCodeSpecForDisplay().labelSuffix, "6 ספרות");
});
