import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countSkippedInSet,
  countVisitedInSet,
  houseMatchesSet,
  isStubHouse,
  resolveViewerHouseSet,
} from "@/lib/house-set";

describe("countSkippedInSet", () => {
  it("ignores rehearsal stubs when counting skips in real mode", () => {
    const houses = [
      { id: "real-1", description: "בית אמיתי" },
      { id: "בית-9310", description: "סטאב לחזרה — נפתח בקרוב." },
    ];
    assert.equal(isStubHouse(houses[1]!), true);
    assert.equal(
      countSkippedInSet(["real-1", "בית-9310"], houses, "real"),
      1,
    );
    assert.equal(
      countSkippedInSet(["real-1", "בית-9310"], houses, "stubs"),
      1,
    );
    assert.equal(
      countSkippedInSet(["real-1", "בית-9310"], houses, "all"),
      2,
    );
  });

  it("counts stub skips in stubs mode from catalog-only lookup rows", () => {
    const catalogStub = {
      id: "בית-1847",
      description: "סטאב לחזרה — דלעות על המדרגה.",
    };
    assert.equal(
      countSkippedInSet(["בית-1847"], [catalogStub], "stubs"),
      1,
    );
    assert.equal(
      countSkippedInSet(["בית-1847"], [], "stubs"),
      0,
    );
  });

  it("counts rehearsal stub ids in stubs mode even without a house row", () => {
    assert.equal(countSkippedInSet(["בית-9310"], [], "stubs"), 1);
  });

  it("treats device-cache shell rows as stubs when id is a known rehearsal house", () => {
    assert.equal(
      isStubHouse({
        id: "בית-2291",
        description: "",
        photoUrl: "",
        deviceCachePin: true,
      }),
      true,
    );
    assert.equal(houseMatchesSet({ id: "בית-2291", description: "" }, "real"), false);
  });

  it("treats rehearsal snapshot photos as stubs when description was stripped", () => {
    const row = {
      id: "בית-1847",
      description: "",
      photoUrl: "/images/stubs/pumpkin-porch.jpg",
    };
    assert.equal(isStubHouse(row), true);
    assert.equal(houseMatchesSet(row, "real"), false);
  });

  it("treats leaked E2E houses as stubs hidden from real mode", () => {
    const e2e = { id: "e2e-1", name: "בית batch5", description: "בדיקת E2E — לא בית אמיתי" };
    assert.equal(isStubHouse(e2e), true);
    assert.equal(countSkippedInSet(["e2e-1"], [e2e], "real"), 0);
    assert.equal(countSkippedInSet(["e2e-1"], [e2e], "stubs"), 1);
  });
});

describe("countVisitedInSet", () => {
  it("uses the same house-set rules as skipped counts", () => {
    const houses = [
      { id: "real-1", description: "בית אמיתי" },
      { id: "בית-9310", description: "סטאב לחזרה — נפתח בקרוב." },
    ];
    assert.equal(countVisitedInSet(["real-1", "בית-9310"], houses, "real"), 1);
    assert.equal(countVisitedInSet(["real-1", "בית-9310"], houses, "stubs"), 1);
    assert.equal(countVisitedInSet(["real-1", "בית-9310"], houses, "all"), 2);
  });
});

describe("resolveViewerHouseSet", () => {
  const stubsOnly = {
    houses: [{ id: "בית-9310", description: "סטאב לחזרה — נפתח בקרוב." }],
  };
  const mixed = {
    houses: [
      { id: "real-1", description: "בית אמיתי" },
      { id: "בית-9310", description: "סטאב לחזרה" },
    ],
  };

  it("shows all houses on preview when the catalog is stub-only", () => {
    assert.equal(resolveViewerHouseSet(stubsOnly, false, "real", { previewDeployment: true }), "all");
  });

  it("keeps real filter on production even when the catalog is stub-only", () => {
    assert.equal(resolveViewerHouseSet(stubsOnly, false, "real", { previewDeployment: false }), "real");
    assert.equal(resolveViewerHouseSet(stubsOnly, false, "real"), "real");
  });

  it("keeps real filter when real houses exist", () => {
    assert.equal(resolveViewerHouseSet(mixed, false, "real", { previewDeployment: true }), "real");
  });

  it("respects admin house-set preference", () => {
    assert.equal(resolveViewerHouseSet(stubsOnly, true, "stubs"), "stubs");
  });
});
