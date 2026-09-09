import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { houseOpenDuringVisitWindow, visitWindowIssue } from "@/lib/hours";

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
