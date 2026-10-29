import assert from "node:assert/strict";
import test from "node:test";
import {
  formatRouteDurationChip,
  formatRouteDurationPhrase,
} from "@/lib/route-duration-display";

test("formatRouteDurationChip under one hour stays minutes", () => {
  const chip = formatRouteDurationChip(45, "he");
  assert.equal(chip.value, "כ־45");
  assert.equal(chip.label, "דק׳");
});

test("formatRouteDurationChip splits hours and minutes from 60+", () => {
  const chip = formatRouteDurationChip(556, "he");
  assert.equal(chip.value, "כ־9");
  assert.match(chip.label, /16/u);
  assert.match(chip.label, /שע/u);
});

test("formatRouteDurationChip whole hours omit minutes", () => {
  const chip = formatRouteDurationChip(120, "en");
  assert.equal(chip.value, "~2");
  assert.equal(chip.label, "hr");
});

test("formatRouteDurationPhrase for share line", () => {
  assert.match(formatRouteDurationPhrase(556, "he"), /9/u);
  assert.match(formatRouteDurationPhrase(556, "he"), /16/u);
});
