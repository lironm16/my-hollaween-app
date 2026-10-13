import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clusterIsSchoolCampus,
  isSchoolCampusAddress,
  schoolCampusNeighborhoodForAddress,
} from "@/lib/school-campus";

/** Mirrors add-house form: school pick locks hood + map pin. */
function addHouseSchoolCampusPolicy(address: string) {
  const campus = isSchoolCampusAddress(address);
  return {
    pinDraggable: !campus,
    hoodLocked: campus,
    neighborhood: schoolCampusNeighborhoodForAddress(address),
    mapPinIsCastle: clusterIsSchoolCampus([{ address }]),
  };
}

describe("add-house school campus policy", () => {
  it("locks pin and hood for each curated school", () => {
    for (const address of ["ביה״ס ניצנים", "ביה״ס גבעולים", "ביה״ס המנחיל"]) {
      const policy = addHouseSchoolCampusPolicy(address);
      assert.equal(policy.pinDraggable, false);
      assert.equal(policy.hoodLocked, true);
      assert.equal(policy.mapPinIsCastle, true);
      assert.ok(policy.neighborhood);
    }
  });

  it("allows pin drag on normal streets", () => {
    const policy = addHouseSchoolCampusPolicy("חרוזים 8");
    assert.equal(policy.pinDraggable, true);
    assert.equal(policy.hoodLocked, false);
    assert.equal(policy.mapPinIsCastle, false);
    assert.equal(policy.neighborhood, null);
  });
});
