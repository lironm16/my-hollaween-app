import assert from "node:assert/strict";
import { test } from "node:test";
import { containsChipMarkers, renderHelpText } from "./render-help-text";

test("renderHelpText leaves plain text unchanged", () => {
  assert.equal(renderHelpText("לחצו על כפתור"), "לחצו על כפתור");
});

test("renderHelpText wraps <<label>> in HelpUiChip", () => {
  const node = renderHelpText("לחצו על <<סינון>> בסרגל");
  assert.ok(node);
  assert.notEqual(typeof node, "string");
});

test("renderHelpText supports multiple chips", () => {
  const node = renderHelpText("<<א>> ו<<ב>>");
  assert.ok(node);
  assert.notEqual(typeof node, "string");
});

test("renderHelpText preserves newline breaks", () => {
  const node = renderHelpText("<<א>>\n<<ב>>");
  assert.ok(node);
  assert.notEqual(typeof node, "string");
});

test("renderHelpText renders **strong** emphasis without chips", () => {
  const node = renderHelpText("בתים ש**עוברים** את הסינון");
  assert.ok(node);
  assert.notEqual(typeof node, "string");
});

test("renderHelpText mixes chips and emphasis", () => {
  const node = renderHelpText("לחצו <<איפוס>> על **רק** אלה");
  assert.ok(node);
  assert.notEqual(typeof node, "string");
});

test("containsChipMarkers detects <<>> markers", () => {
  assert.equal(containsChipMarkers("<<סינון>>"), true);
  assert.equal(containsChipMarkers("plain text"), false);
  assert.equal(containsChipMarkers("**bold** only"), false);
});
