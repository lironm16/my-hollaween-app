import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clusterIsSchoolCampus,
  usesSchoolCampusClusterChrome,
  clusterOverviewSubtitle,
  clusterBulkActionSubtitle,
  clusterPinAriaLabel,
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

  it("uses school copy for one booth or many", () => {
    assert.equal(clusterIsSchoolCampus([{ address: "ביה״ס ניצנים" }]), true);
    assert.equal(usesSchoolCampusClusterChrome([{ address: "ביה״ס ניצנים" }]), true);
    assert.equal(usesSchoolCampusClusterChrome([{ address: "חרוזים 8" }]), false);
    assert.equal(clusterOverviewSubtitle([{ address: "ביה״ס ניצנים" }]), "דוכן אחד בבית הספר");
    assert.equal(
      clusterOverviewSubtitle([
        { address: "ביה״ס ניצנים" },
        { address: "ביה״ס ניצנים" },
      ]),
      "2 דוכנים בבית הספר",
    );
    assert.equal(clusterOverviewSubtitle([{ address: "חרוזים 8" }]), "בית בכתובת זו");
    assert.equal(clusterPinAriaLabel([{ address: "ביה״ס גבעולים" }]), "דוכן בבית הספר");
    assert.equal(
      clusterBulkActionSubtitle([{ address: "ביה״ס המנחיל" }]),
      "ביה״ס המנחיל",
    );
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
