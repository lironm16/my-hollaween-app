import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyDeviceActivityUpdate,
  activityTotalsFromDoc,
  emptyActivityDoc,
  pruneActivityDevices,
} from "@/lib/activity-firestore";

describe("activity firestore doc", () => {
  it("updates running totals when a device reports new counts", () => {
    const doc = emptyActivityDoc();
    assert.equal(applyDeviceActivityUpdate(doc, "aaaaaaaaaaaaaaaa", 3, 5, 100), true);
    assert.equal(applyDeviceActivityUpdate(doc, "bbbbbbbbbbbbbbbb", 2, 1, 200), true);
    const totals = activityTotalsFromDoc(doc);
    assert.equal(totals.totalLiked, 5);
    assert.equal(totals.totalVisited, 6);
    assert.equal(totals.devicesReporting, 2);
  });

  it("skips write when device counts are unchanged", () => {
    const doc = emptyActivityDoc();
    applyDeviceActivityUpdate(doc, "aaaaaaaaaaaaaaaa", 3, 5, 100);
    assert.equal(applyDeviceActivityUpdate(doc, "aaaaaaaaaaaaaaaa", 3, 5, 200), false);
    assert.equal(doc.devices.aaaaaaaaaaaaaaaa?.at, 100);
  });

  it("applies deltas when a device changes counts", () => {
    const doc = emptyActivityDoc();
    applyDeviceActivityUpdate(doc, "aaaaaaaaaaaaaaaa", 3, 5, 100);
    applyDeviceActivityUpdate(doc, "aaaaaaaaaaaaaaaa", 4, 5, 200);
    const totals = activityTotalsFromDoc(doc);
    assert.equal(totals.totalLiked, 4);
    assert.equal(totals.totalVisited, 5);
  });

  it("subtracts pruned device counts from running totals", () => {
    const doc = emptyActivityDoc();
    for (let i = 0; i < 5001; i++) {
      const id = `device-${String(i).padStart(8, "0")}`;
      applyDeviceActivityUpdate(doc, id, 1, 1, i);
    }
    pruneActivityDevices(doc);
    const totals = activityTotalsFromDoc(doc);
    assert.equal(totals.devicesReporting, 5000);
    assert.equal(totals.totalLiked, 5000);
    assert.equal(totals.totalVisited, 5000);
    assert.equal(doc.devices["device-00000000"], undefined);
  });
});
