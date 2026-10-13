import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boothNumberForHouse,
  clusterBoothLabel,
  nextBoothNumberForAddress,
} from "@/lib/cluster-booth";

describe("cluster booth numbers", () => {
  it("assigns next serial with gaps after delete", () => {
    const houses = [
      { address: "ביה״ס גבעולים", boothNumber: 1, deletedAt: null },
      { address: "ביה״ס גבעולים", boothNumber: 2, deletedAt: null },
      { address: "ביה״ס גבעולים", boothNumber: 3, deletedAt: "2026-01-01T00:00:00.000Z" },
      { address: "ביה״ס גבעולים", boothNumber: 4, deletedAt: null },
    ];
    assert.equal(nextBoothNumberForAddress(houses, "ביה״ס גבעולים"), 5);
  });

  it("labels school booths for multi-booth clusters", () => {
    const cluster = [{ address: "ביה״ס גבעולים" }, { address: "ביה״ס גבעולים" }];
    assert.equal(
      clusterBoothLabel({ address: "ביה״ס גבעולים", boothNumber: 2 }, cluster),
      "דוכן 2",
    );
    assert.equal(boothNumberForHouse({ boothNumber: 2.9 }), 2);
  });

  it("labels single-booth school as דוכן 1", () => {
    assert.equal(
      clusterBoothLabel({ address: "ביה״ס ניצנים", boothNumber: 1 }, [{ address: "ביה״ס ניצנים" }]),
      "דוכן 1",
    );
  });

  it("keeps stub and real booth counters separate at the same school", () => {
    const houses = [
      { address: "ביה״ס ניצנים", boothNumber: 11, isStub: true, deletedAt: null },
      { address: "ביה״ס ניצנים", boothNumber: 10, isStub: true, deletedAt: null },
      { address: "ביה״ס ניצנים", boothNumber: 29, isStub: false, deletedAt: null },
    ];
    assert.equal(nextBoothNumberForAddress(houses, "ביה״ס ניצנים", "real"), 30);
    assert.equal(nextBoothNumberForAddress(houses, "ביה״ס ניצנים", "stub"), 12);
    assert.equal(
      clusterBoothLabel(
        { address: "ביה״ס ניצנים", boothNumber: 11, isStub: true },
        [{ address: "ביה״ס ניצנים" }],
      ),
      "דוכן חזרה 11",
    );
  });

  it("does not label multi-house street clusters as יחידה", () => {
    const cluster = [{ address: "חרוזים 8" }, { address: "חרוזים 8, חרוזים" }];
    assert.equal(
      clusterBoothLabel({ address: "חרוזים 8", boothNumber: 1 }, cluster),
      null,
    );
  });
});
