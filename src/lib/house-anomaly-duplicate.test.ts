import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  duplicateCompareTextsSimilar,
  formatDuplicateApartmentPairDetail,
  housesSuspectDuplicateApartment,
  normalizeDuplicateCompareText,
} from "@/lib/house-anomaly-duplicate";
import type { House } from "@/lib/types";

function house(overrides: Partial<House> = {}): House {
  return {
    id: "בית-1001",
    name: "בית המפלצות",
    theme: "pumpkin",
    address: "חרוזים 8",
    arrival: "קומה 2, דירה 5",
    description: "",
    lat: 32.0919,
    lng: 34.8112,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    visit: "come",
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "20:00",
    openHours: [{ from: "17:00", to: "20:00" }],
    notes: "",
    accessible: false,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    editCode: "123456",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("house-anomaly-duplicate", () => {
  it("normalizes and compares similar phrasing", () => {
    assert.equal(
      normalizeDuplicateCompareText("קומה 2, דירה 5"),
      normalizeDuplicateCompareText("קומה 2 דירה 5"),
    );
    assert.equal(duplicateCompareTextsSimilar("בית המפלצות", "בית מפלצות"), true);
    assert.equal(
      duplicateCompareTextsSimilar("קומה 2, דירה 5", "דירה 5, קומה 2, מעלית"),
      true,
    );
    assert.equal(duplicateCompareTextsSimilar("קומה 2, דירה 5", "קומה 3, דירה 8"), false);
  });

  it("flags same apartment number and similar submitter pairs", () => {
    const a = house({
      id: "בית-2001",
      name: "דירת הדלעות",
      arrival: "קומה 2, דירה 5",
      addedBy: "משפחת לוי",
    });
    const b = house({
      id: "בית-2002",
      name: "דירת דלעות",
      arrival: "דירה 5, קומה 2",
      addedBy: "משפחת לוי",
    });
    assert.equal(housesSuspectDuplicateApartment(a, b), true);

    const c = house({
      id: "בית-2003",
      name: "בית אחר",
      arrival: "קומה 4, דירה 11",
      addedBy: "משפחת כהן",
    });
    assert.equal(housesSuspectDuplicateApartment(a, c), false);
  });

  it("formats pair detail for admin", () => {
    const line = formatDuplicateApartmentPairDetail(
      house({ name: "א", arrival: "דירה 3", addedBy: "דנה" }),
      house({ id: "בית-2", name: "ב", arrival: "קומה 1 דירה 3", addedBy: "דנה" }),
    );
    assert.match(line, /א ↔ ב/);
    assert.match(line, /נוסף ע״י דנה/);
  });
});
