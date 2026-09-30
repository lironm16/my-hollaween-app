import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAddSlot,
  effectiveDeviceSlotMax,
  emptyDeviceAccess,
  slotsReserved,
} from "./policy";

describe("house-access policy", () => {
  it("defaults slot max to 3", () => {
    assert.equal(effectiveDeviceSlotMax({ deviceAccess: emptyDeviceAccess() }), 3);
  });

  it("counts pending toward capacity", () => {
    const access = {
      ...emptyDeviceAccess(),
      pending: [
        {
          id: "p1",
          tokenHash: "x",
          role: "visitor" as const,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    };
    assert.equal(slotsReserved(access), 1);
    assert.equal(canAddSlot({ deviceAccess: access }), true);
  });
});
