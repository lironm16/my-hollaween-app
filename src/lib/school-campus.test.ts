import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clusterIsSchoolCampus,
  isSchoolCampusAddress,
  schoolCampusNeighborhoodForAddress,
} from "@/lib/school-campus";

describe("school campus", () => {
  it("detects curated school addresses", () => {
    assert.equal(isSchoolCampusAddress("ביה״ס ניצנים"), true);
    assert.equal(isSchoolCampusAddress("חרוזים 8"), false);
  });

  it("maps each school campus to a fixed neighborhood", () => {
    assert.equal(schoolCampusNeighborhoodForAddress("ביה״ס ניצנים"), "שיכון ותיקים");
    assert.equal(schoolCampusNeighborhoodForAddress("ביה״ס גבעולים"), "הגפן");
    assert.equal(schoolCampusNeighborhoodForAddress("ביה״ס המנחיל"), "נחלת גנים");
  });

  it("requires every cluster member to be at a school", () => {
    assert.equal(
      clusterIsSchoolCampus([
        { address: "ביה״ס גבעולים" },
        { address: "ביה״ס גבעולים" },
      ]),
      true,
    );
    assert.equal(
      clusterIsSchoolCampus([
        { address: "ביה״ס גבעולים" },
        { address: "חרוזים 8" },
      ]),
      false,
    );
  });
});
