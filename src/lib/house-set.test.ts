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
  it("ignores stubs when counting skips in real mode", () => {
    const houses = [
      { id: "real-1", isStub: false },
      { id: "בית-9310", isStub: true },
    ];
    assert.equal(isStubHouse(houses[1]!), true);
    assert.equal(countSkippedInSet(["real-1", "בית-9310"], houses, "real"), 1);
    assert.equal(countSkippedInSet(["real-1", "בית-9310"], houses, "stubs"), 1);
    assert.equal(countSkippedInSet(["real-1", "בית-9310"], houses, "all"), 2);
  });

  it("counts stub skips in stubs mode only when catalog row exists", () => {
    const catalogStub = { id: "בית-1847", isStub: true };
    assert.equal(countSkippedInSet(["בית-1847"], [catalogStub], "stubs"), 1);
    assert.equal(countSkippedInSet(["בית-1847"], [], "stubs"), 0);
  });

  it("treats device-cache shell rows as stubs when isStub was persisted", () => {
    assert.equal(
      isStubHouse({
        id: "בית-2291",
        isStub: true,
        deviceCachePin: true,
      }),
      true,
    );
    assert.equal(houseMatchesSet({ id: "בית-2291", isStub: true }, "real"), false);
  });

  it("supports legacy deviceCacheStub without isStub", () => {
    assert.equal(isStubHouse({ deviceCacheStub: true }), true);
  });

  it("real rows are not stubs", () => {
    assert.equal(isStubHouse({ id: "x", isStub: false }), false);
    assert.equal(isStubHouse({ id: "x" }), false);
  });
});

describe("countVisitedInSet", () => {
  it("uses the same house-set rules as skipped counts", () => {
    const houses = [
      { id: "real-1", isStub: false },
      { id: "בית-9310", isStub: true },
    ];
    assert.equal(countVisitedInSet(["real-1", "בית-9310"], houses, "real"), 1);
    assert.equal(countVisitedInSet(["real-1", "בית-9310"], houses, "stubs"), 1);
    assert.equal(countVisitedInSet(["real-1", "בית-9310"], houses, "all"), 2);
  });
});

describe("resolveViewerHouseSet", () => {
  const stubsOnly = {
    houses: [{ id: "בית-9310", isStub: true }],
  };
  const mixed = {
    houses: [
      { id: "real-1", isStub: false },
      { id: "בית-9310", isStub: true },
    ],
  };

  it("shows all houses on preview when the catalog is stub-only", () => {
    assert.equal(resolveViewerHouseSet(stubsOnly, false, "real", { previewDeployment: true }), "all");
  });

  it("keeps real filter on production even when the catalog is stub-only", () => {
    assert.equal(resolveViewerHouseSet(stubsOnly, false, "real", { previewDeployment: false }), "real");
    assert.equal(resolveViewerHouseSet(stubsOnly, false, "real"), "real");
  });

  it("shows real and stubs on preview when both exist", () => {
    assert.equal(resolveViewerHouseSet(mixed, false, "real", { previewDeployment: true }), "all");
  });

  it("respects admin house-set preference", () => {
    assert.equal(resolveViewerHouseSet(stubsOnly, true, "stubs"), "stubs");
  });
});
