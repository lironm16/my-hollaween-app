import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  houseOpenDuringVisitWindow,
  isOpenDuringCustomVisitForFilter,
  isOpenNowForFilter,
  visitWindowIssue,
} from "@/lib/hours";

describe("visitWindowIssue", () => {
  it("rejects end before start", () => {
    assert.match(visitWindowIssue("19:00", "18:00") ?? "", /שעת הסיום/);
  });

  it("accepts a valid window", () => {
    assert.equal(visitWindowIssue("18:00", "20:00"), null);
  });
});

describe("houseOpenDuringVisitWindow", () => {
  it("matches overlapping house hours", () => {
    const open = houseOpenDuringVisitWindow(
      { openFrom: "17:00", openTo: "21:00" },
      "18:00",
      "20:00",
    );
    assert.equal(open, true);
  });

  it("rejects houses that close before the visit starts", () => {
    const open = houseOpenDuringVisitWindow(
      { openFrom: "17:00", openTo: "18:30" },
      "19:00",
      "20:00",
    );
    assert.equal(open, false);
  });
});

describe("isOpenNowForFilter", () => {
  const eveningHouse = { id: "בית-1847", openFrom: "17:00", openTo: "21:00", visit: "come" as const };
  const probe = new Date(2026, 9, 31, 18, 30, 0, 0);

  it("matches a house open at the start bound only", () => {
    assert.equal(isOpenNowForFilter(eveningHouse, "18:30", "", probe), true);
  });

  it("rejects houses that only open later", () => {
    const later = { openFrom: "19:00", openTo: "21:00", visit: "come" as const };
    assert.equal(isOpenNowForFilter(later, "18:30", "20:00", probe), false);
  });
});

describe("isOpenDuringCustomVisitForFilter", () => {
  const probe = new Date(2026, 9, 31, 18, 30, 0, 0);

  it("includes houses that open later from the departure time", () => {
    const later = { openFrom: "19:00", openTo: "21:00", visit: "come" as const };
    assert.equal(isOpenDuringCustomVisitForFilter(later, "18:30", "", probe), true);
  });

  it("excludes houses that already closed before departure", () => {
    const early = { openFrom: "17:00", openTo: "18:00", visit: "come" as const };
    assert.equal(isOpenDuringCustomVisitForFilter(early, "18:30", "", probe), false);
  });

  it("requires overlap across a start and end bound", () => {
    const later = { openFrom: "19:00", openTo: "21:00", visit: "come" as const };
    assert.equal(isOpenDuringCustomVisitForFilter(later, "18:30", "20:00", probe), true);
    assert.equal(isOpenDuringCustomVisitForFilter(later, "18:30", "19:00", probe), false);
  });
});
