import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  availableTemporaryRestoreOptions,
  houseLacksCandy,
  isHouseOpenForSkip,
  isTemporarySkipReason,
  skipMetaSummary,
  skipStatusSnapshot,
  suggestedSkipReasons,
  temporaryRestoreAlertText,
  temporaryRestoreReasonMet,
} from "@/lib/skip-reasons";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";

function stub(overrides: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id: "a",
    name: "בית",
    theme: "pumpkin",
    address: "חרוזים 8",
    arrival: "",
    description: "",
    lat: 32.0919,
    lng: 34.8112,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    visit: "come",
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    openHours: [{ from: "17:00", to: "21:00" }],
    openFrom2: "",
    openTo2: "",
    notes: "",
    accessible: true,
    decorLevel: "medium",
    decorated: true,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const baseFilters: HouseFiltersState = {
  accessibleOnly: false,
  openNowOnly: false,
  closingSoonOnly: false,
  openingSoonOnly: false,
  notYetOpenOnly: false,
  onBreakOnly: false,
  afterHoursOnly: false,
  visitWindowMode: "all",
  visitWindowFrom: "",
  visitWindowTo: "",
  closedOnly: false,
  decorOnlyOnly: false,
  sensitivityFilters: [],
  scareFilters: ["mild", "medium", "spicy"],
  candyFilters: ["none", "plenty", "low", "out"],
  neighborhoodFilters: ["חרוזים", "נחלת גנים", "שיכון ותיקים"],
  likedOnly: false,
  unvisitedOnly: false,
  visitedOnly: false,
  skippedOnly: false,
  includeUndecorated: true,
};

const evening = new Date("2026-10-31T18:00:00");

describe("suggestedSkipReasons", () => {
  it("suggests closed when the house is closed", () => {
    const options = suggestedSkipReasons(
      stub({ visit: "closed", soldOut: true }),
      evening,
      baseFilters,
    );
    assert.equal(options[0]?.id, "closed");
  });

  it("marks dialog restore reasons as temporary-friendly", () => {
    assert.equal(isTemporarySkipReason("not-open"), true);
    assert.equal(isTemporarySkipReason("candy-out"), true);
    assert.equal(isTemporarySkipReason("closed"), false);
    assert.equal(isTemporarySkipReason("other"), false);
  });
});

describe("availableTemporaryRestoreOptions", () => {
  it("offers no temp skip when the house is open and has candy", () => {
    const options = availableTemporaryRestoreOptions(stub(), evening, baseFilters);
    assert.equal(options.length, 0);
    assert.equal(isHouseOpenForSkip(stub(), evening, baseFilters), true);
    assert.equal(houseLacksCandy(stub()), false);
  });

  it("offers open restore only when the house is closed", () => {
    const options = availableTemporaryRestoreOptions(
      stub({ visit: "closed", soldOut: true }),
      evening,
      baseFilters,
    );
    assert.deepEqual(options, [{ id: "not-open", label: "הבית פתוח" }]);
  });

  it("offers candy restore only when candy is out", () => {
    const options = availableTemporaryRestoreOptions(
      stub({ treatStock: { candy: "out" } }),
      evening,
      baseFilters,
    );
    assert.deepEqual(options, [{ id: "candy-out", label: "יש ממתקים" }]);
  });
});

describe("temporaryRestoreReasonMet", () => {
  it("restores on open only for not-open skips", () => {
    const closed = stub({ visit: "closed", soldOut: true });
    const open = stub({ visit: "come", soldOut: false });
    assert.equal(temporaryRestoreReasonMet(closed, "not-open", evening, baseFilters), false);
    assert.equal(temporaryRestoreReasonMet(open, "not-open", evening, baseFilters), true);
    assert.equal(temporaryRestoreReasonMet(open, "candy-out", evening, baseFilters), true);
  });

  it("restores on candy only for candy-out skips", () => {
    const out = stub({ treatStock: { candy: "out" } });
    const plenty = stub({ treatStock: { candy: "plenty" } });
    assert.equal(temporaryRestoreReasonMet(out, "candy-out", evening, baseFilters), false);
    assert.equal(temporaryRestoreReasonMet(plenty, "candy-out", evening, baseFilters), true);
    assert.equal(temporaryRestoreReasonMet(plenty, "not-open", evening, baseFilters), true);
  });
});

describe("temporaryRestoreAlertText", () => {
  it("mentions the house and restore trigger", () => {
    assert.match(
      temporaryRestoreAlertText(stub({ name: "משפחת לוין" }), "not-open"),
      /משפחת לוין חזר למסלול — הבית פתוח/,
    );
    assert.match(
      temporaryRestoreAlertText(stub({ name: "משפחת לוין" }), "candy-out"),
      /משפחת לוין חזר למסלול — יש ממתקים/,
    );
  });
});

describe("skipMetaSummary", () => {
  it("describes temporary and permanent skips", () => {
    assert.equal(
      skipMetaSummary({
        reason: "not-open",
        temporary: true,
        statusKey: "x",
        skippedAt: "2026-01-01T00:00:00.000Z",
      }),
      "דילוג זמני · החזרה כשהבית פתוח",
    );
    assert.equal(
      skipMetaSummary({
        reason: "other",
        temporary: false,
        statusKey: "x",
        skippedAt: "2026-01-01T00:00:00.000Z",
      }),
      "דילוג קבוע",
    );
  });
});

describe("skipStatusSnapshot", () => {
  it("changes when visit state changes", () => {
    const closed = stub({ visit: "closed", soldOut: true });
    const open = stub({ visit: "come", soldOut: false });
    assert.notEqual(
      skipStatusSnapshot(closed, evening, baseFilters),
      skipStatusSnapshot(open, evening, baseFilters),
    );
  });
});
