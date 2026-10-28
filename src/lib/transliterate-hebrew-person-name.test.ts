import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { transliterateHebrewPersonName } from "@/lib/transliterate-hebrew-person-name";

describe("transliterateHebrewPersonName", () => {
  it("romanizes given names instead of translating them", () => {
    assert.equal(transliterateHebrewPersonName("יריב"), "Yariv");
    assert.equal(transliterateHebrewPersonName("אור"), "Or");
    assert.equal(transliterateHebrewPersonName("דור"), "Dor");
  });

  it("keeps Latin names unchanged", () => {
    assert.equal(transliterateHebrewPersonName("David"), "David");
    assert.equal(transliterateHebrewPersonName("Sabrra"), "Sabrra");
  });

  it("formats משפחת prefix as an English family label", () => {
    assert.equal(transliterateHebrewPersonName("משפחת יריב"), "Yariv family");
  });
});
