import assert from "node:assert/strict";
import test from "node:test";
import { renderHelpText } from "./render-help-text";

test("renderHelpText leaves plain text unchanged", () => {
  assert.equal(renderHelpText("לחצו על כפתור"), "לחצו על כפתור");
});

test("renderHelpText leaves UI label names as plain text", () => {
  assert.equal(renderHelpText("לחצו על סינון בסרגל"), "לחצו על סינון בסרגל");
});

test("renderHelpText preserves newline breaks", () => {
  const node = renderHelpText("א\nב");
  assert.notEqual(node, "א\nב");
});

test("renderHelpText renders **strong** emphasis", () => {
  const node = renderHelpText("בתים ש**עוברים** את הסינון");
  assert.notEqual(node, "בתים ש**עוברים** את הסינון");
});

test("renderHelpText mixes plain labels and emphasis", () => {
  const node = renderHelpText("לחצו איפוס על **רק** אלה");
  assert.notEqual(node, "לחצו איפוס על **רק** אלה");
});
