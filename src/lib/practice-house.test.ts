import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  housesForMainMap,
  isNeighborhoodHouse,
  isPracticeHouse,
  practiceHousesVisibleToUsers,
  stripPracticeHouses,
} from "@/lib/practice-house";

describe("practice houses", () => {
  it("flags practice rows and strips them from neighborhood metrics", () => {
    const practice = { id: "תרגול-1", isPractice: true, isStub: false };
    const real = { id: "בית-1", isStub: false, isPractice: false as const };
    assert.equal(isPracticeHouse(practice), true);
    assert.equal(isNeighborhoodHouse(practice), false);
    assert.equal(isNeighborhoodHouse(real), true);
    assert.deepEqual(stripPracticeHouses([practice, real]), [real]);
  });

  it("shows practice on the map only for admins while dev flag is off", () => {
    assert.equal(practiceHousesVisibleToUsers(), false);
    const practice = { id: "תרגול-1", isPractice: true, isStub: false };
    const real = { id: "בית-1", isStub: false, isPractice: false as const };
    const list = [practice, real];
    assert.deepEqual(
      housesForMainMap(list, "real", { admin: false }).map((h) => h.id),
      ["בית-1"],
    );
    assert.deepEqual(
      housesForMainMap(list, "real", { admin: true }).map((h) => h.id),
      ["תרגול-1", "בית-1"],
    );
  });
});
