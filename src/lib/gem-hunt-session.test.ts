import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  beginGemHuntSession,
  endGemHuntSession,
  isGemHuntSessionActive,
} from "@/lib/gem-hunt-session";

describe("gem-hunt-session", () => {
  it("tracks nested overlay depth", () => {
    assert.equal(isGemHuntSessionActive(), false);
    beginGemHuntSession();
    assert.equal(isGemHuntSessionActive(), true);
    beginGemHuntSession();
    assert.equal(isGemHuntSessionActive(), true);
    endGemHuntSession();
    assert.equal(isGemHuntSessionActive(), true);
    endGemHuntSession();
    assert.equal(isGemHuntSessionActive(), false);
  });
});
