import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  availableTemporaryRestoreOptions,
  primaryTemporaryRestoreOption,
  houseLacksCandy,
  isHouseOpenForSkip,
  isTemporarySkipReason,
  shouldEmitTemporarySkipRestoreAlert,
  skipMetaSummary,
  skipSnapshotHadCandyOutOrClosed,
  skipStatusSnapshot,
  suggestedSkipReasons,
  metaRestoreTriggers,
  temporaryRestoreAlertText,
  temporaryRestoreReasonMet,
  temporarySkipRestoreMet,
} from "@/lib/skip-reasons";
import type { HouseFiltersState, SkippedHouseMeta } from "@/lib/offline-db";
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
    assert.deepEqual(options, [
      { id: "not-open", label: "החזר את הבית כאשר הוא פתוח" },
    ]);
  });

  it("offers candy restore only when candy is out", () => {
    const options = availableTemporaryRestoreOptions(
      stub({ treatStock: { candy: "out" } }),
      evening,
      baseFilters,
    );
    assert.deepEqual(options, [
      { id: "candy-out", label: "החזר את הבית כאשר יש ממתקים" },
    ]);
  });

  it("offers no candy restore when candy is only low", () => {
    const low = stub({ treatStock: { candy: "low" } });
    const options = availableTemporaryRestoreOptions(low, evening, baseFilters);
    assert.equal(options.length, 0);
    assert.equal(houseLacksCandy(low), false);
  });

  it("prefers open restore when the house is closed and out of candy", () => {
    const option = primaryTemporaryRestoreOption(
      stub({ visit: "closed", soldOut: true, treatStock: { candy: "out" } }),
      evening,
      baseFilters,
    );
    assert.deepEqual(option, {
      id: "not-open",
      label: "החזר את הבית כאשר הוא פתוח",
    });
  });

  it("prefers open restore when the house is on break with low candy", () => {
    const onBreakLow = stub({
      treatStock: { candy: "low" },
      ownerFrozenUntil: new Date("2026-10-31T20:00:00").toISOString(),
    });
    const option = primaryTemporaryRestoreOption(onBreakLow, evening, baseFilters);
    assert.deepEqual(option, {
      id: "not-open",
      label: "החזר את הבית כאשר הוא פתוח",
    });
  });

  it("prefers open restore when the house is on break and out of candy", () => {
    const onBreakOut = stub({
      treatStock: { candy: "out" },
      ownerFrozenUntil: new Date("2026-10-31T20:00:00").toISOString(),
    });
    const option = primaryTemporaryRestoreOption(onBreakOut, evening, baseFilters);
    assert.deepEqual(option, {
      id: "not-open",
      label: "החזר את הבית כאשר הוא פתוח",
    });
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

describe("temporarySkipRestoreMet", () => {
  it("waits for every selected restore trigger", () => {
    const closedNoCandy = stub({ visit: "closed", soldOut: true, treatStock: { candy: "out" } });
    const openNoCandy = stub({ visit: "come", soldOut: false, treatStock: { candy: "out" } });
    const openWithCandy = stub({ visit: "come", soldOut: false, treatStock: { candy: "plenty" } });
    const dualMeta: SkippedHouseMeta = {
      reason: "not-open",
      temporary: true,
      restoreTriggers: ["not-open", "candy-out"],
      statusKey: "x",
      skippedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(temporarySkipRestoreMet(closedNoCandy, dualMeta, evening, baseFilters), false);
    assert.equal(temporarySkipRestoreMet(openNoCandy, dualMeta, evening, baseFilters), false);
    assert.equal(temporarySkipRestoreMet(openWithCandy, dualMeta, evening, baseFilters), true);
  });
});

describe("temporaryRestoreAlertText", () => {
  it("mentions the house and restore trigger", () => {
    assert.match(
      temporaryRestoreAlertText(stub({ name: "משפחת לוין" }), {
        reason: "not-open",
        temporary: true,
        statusKey: "x",
        skippedAt: "2026-01-01T00:00:00.000Z",
      }),
      /משפחת לוין חזר לרשימה — הבית פתוח/,
    );
    assert.match(
      temporaryRestoreAlertText(stub({ name: "משפחת לוין" }), {
        reason: "candy-out",
        temporary: true,
        statusKey: "x",
        skippedAt: "2026-01-01T00:00:00.000Z",
      }),
      /משפחת לוין חזר לרשימה — יש ממתקים/,
    );
    assert.match(
      temporaryRestoreAlertText(stub({ name: "משפחת לוין" }), {
        reason: "not-open",
        temporary: true,
        restoreTriggers: ["not-open", "candy-out"],
        statusKey: "x",
        skippedAt: "2026-01-01T00:00:00.000Z",
      }),
      /משפחת לוין חזר לרשימה — הבית פתוח ויש ממתקים/,
    );
  });
});

describe("metaRestoreTriggers", () => {
  it("falls back to reason for older skips", () => {
    assert.deepEqual(
      metaRestoreTriggers({
        reason: "candy-out",
        temporary: true,
        statusKey: "x",
        skippedAt: "2026-01-01T00:00:00.000Z",
      }),
      ["candy-out"],
    );
  });
});

describe("skipSnapshotHadCandyOutOrClosed", () => {
  it("detects closed visit, break, and candy out", () => {
    assert.equal(skipSnapshotHadCandyOutOrClosed("closed|active|active|open|plenty|mild"), true);
    assert.equal(skipSnapshotHadCandyOutOrClosed("come|active|break|open|plenty|mild"), true);
    assert.equal(skipSnapshotHadCandyOutOrClosed("come|active|active|closed-hours|plenty|mild"), true);
    assert.equal(skipSnapshotHadCandyOutOrClosed("come|active|active|open|out|mild"), true);
    assert.equal(skipSnapshotHadCandyOutOrClosed("come|active|active|open|plenty|mild"), false);
  });
});

describe("shouldEmitTemporarySkipRestoreAlert", () => {
  it("alerts only for temporary candy/closed skips", () => {
    assert.equal(
      shouldEmitTemporarySkipRestoreAlert({
        reason: "not-open",
        temporary: true,
        statusKey: "closed|active|active|open|plenty|mild",
        skippedAt: "2026-01-01T00:00:00.000Z",
      }),
      true,
    );
    assert.equal(
      shouldEmitTemporarySkipRestoreAlert({
        reason: "not-open",
        temporary: true,
        statusKey: "come|active|active|open|plenty|mild",
        skippedAt: "2026-01-01T00:00:00.000Z",
      }),
      false,
    );
    assert.equal(
      shouldEmitTemporarySkipRestoreAlert({
        reason: "other",
        temporary: false,
        statusKey: "come|active|active|open|plenty|mild",
        skippedAt: "2026-01-01T00:00:00.000Z",
      }),
      false,
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
      "דילוג זמני · כשהבית פתוח",
    );
    assert.equal(
      skipMetaSummary({
        reason: "other",
        temporary: false,
        statusKey: "x",
        skippedAt: "2026-01-01T00:00:00.000Z",
      }),
      "דילגתם",
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
