import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encounterUiChromeHidden } from "@/lib/gem-encounter";

describe("gem encounter phases", () => {
  it("hides chrome during encounter and resolve", () => {
    assert.equal(encounterUiChromeHidden("approach"), false);
    assert.equal(encounterUiChromeHidden("encounter"), true);
    assert.equal(encounterUiChromeHidden("resolve-wiggle1"), true);
    assert.equal(encounterUiChromeHidden("reward"), false);
  });
});
