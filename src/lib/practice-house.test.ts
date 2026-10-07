import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isNeighborhoodHouse,
  isPracticeHouse,
  practiceHousesVisibleToUsers,
  stripPracticeHouses,
} from "@/lib/practice-house";

describe("practice houses", () => {
  it("flags practice rows and strips them from neighborhood metrics", () => {
    const practice = { id: "תרגול-1", isPractice: true, isStub: false };
    const real = { id: "בית-1", isStub: false, isPractice: false };
    assert.equal(isPracticeHouse(practice), true);
    assert.equal(isNeighborhoodHouse(practice), false);
    assert.equal(isNeighborhoodHouse(real), true);
    assert.deepEqual(stripPracticeHouses([practice, real]), [real]);
  });

  it("stays hidden from visitors while dev flag is off", () => {
    assert.equal(practiceHousesVisibleToUsers(), false);
  });
});
