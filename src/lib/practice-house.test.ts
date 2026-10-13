import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isNeighborhoodHouse, isPracticeHouse, stripPracticeHouses } from "@/lib/practice-house";

describe("legacy practice rows", () => {
  it("filters isPractice from public lists", () => {
    const practice = { id: "תרגול-1", isPractice: true, isStub: false };
    const real = { id: "בית-1", isStub: false, isPractice: false };
    assert.equal(isPracticeHouse(practice), true);
    assert.equal(isNeighborhoodHouse(practice), false);
    assert.equal(isNeighborhoodHouse(real), true);
    assert.deepEqual(stripPracticeHouses([practice, real]), [real]);
  });
});
