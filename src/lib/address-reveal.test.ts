import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addressRevealTime,
  canViewHouseLocationDetails,
  formatDisplayAddressWithPolicy,
  isAddressRevealed,
  makeAddressRevealContext,
  publicHouseForCatalog,
  redactHouseLocationDetails,
} from "@/lib/address-reveal";
import type { PublicHouse } from "@/lib/types";

function stub(overrides: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id: "בית-1001",
    name: "משפחת לוי",
    theme: "pumpkin",
    address: "יהודית 15",
    neighborhood: "חרוזים",
    arrival: "קומה 2",
    description: "",
    lat: 32.09,
    lng: 34.81,
    treats: ["candy"],
    treatStock: {},
    visit: "come",
    scareLevel: "mild",
    openFrom: "18:00",
    openTo: "21:00",
    notes: "",
    accessible: false,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("address reveal", () => {
  it("reveals at noon on event night", () => {
    const before = new Date(addressRevealTime().getTime() - 60_000);
    const at = addressRevealTime();
    assert.equal(isAddressRevealed(before), false);
    assert.equal(isAddressRevealed(at), true);
  });

  it("redacts catalog houses before reveal", () => {
    const house = stub();
    const redacted = publicHouseForCatalog(house, new Date(2026, 9, 31, 11, 59));
    assert.equal(redacted.address, "");
    assert.equal(redacted.arrival, "");
  });

  it("admin and owner bypass before reveal", () => {
    const ctx = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 10, 0),
      isAdmin: false,
      ownedHouseIds: ["בית-1001"],
    });
    assert.equal(canViewHouseLocationDetails("בית-1001", ctx), true);
    assert.equal(canViewHouseLocationDetails("בית-9999", ctx), false);

    const adminCtx = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 10, 0),
      isAdmin: true,
    });
    assert.equal(canViewHouseLocationDetails("בית-9999", adminCtx), true);
  });

  it("admin in user preview follows visitor address policy", () => {
    const ctx = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 10, 0),
      isAdmin: false,
    });
    assert.equal(canViewHouseLocationDetails("בית-9999", ctx), false);
  });

  it("shows hint instead of street before reveal", () => {
    const ctx = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 10, 0),
      isAdmin: false,
    });
    const label = formatDisplayAddressWithPolicy(stub(), "בית-1001", ctx);
    assert.match(label, /31 באוקטובר/u);
    assert.doesNotMatch(label, /12:00/u);
    assert.doesNotMatch(label, /יהודית/u);
  });

  it("redact helper clears fields", () => {
    const next = redactHouseLocationDetails(stub());
    assert.equal(next.address, "");
    assert.equal(next.arrival, "");
  });
});
