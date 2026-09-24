import assert from "node:assert/strict";
import { test } from "node:test";
import { renderHelpText } from "./render-help-text";

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
