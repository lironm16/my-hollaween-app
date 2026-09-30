import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addressRevealTime,
  canViewHouseLocationDetails,
  catalogAccessBlockHintHe,
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

  it("shows block message without catalog access", () => {
    const ctx = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 10, 0),
      hasCatalogAccess: false,
    });
    const label = formatDisplayAddressWithPolicy(stub(), "בית-1001", ctx);
    assert.match(label, /חרוזים/u);
    assert.match(label, new RegExp(catalogAccessBlockHintHe().slice(0, 12)));
    assert.doesNotMatch(label, /יהודית/u);
    assert.doesNotMatch(label, /תיחשף/u);
  });

  it("shows reveal hint with catalog access before noon", () => {
    const ctx = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 10, 0),
      hasCatalogAccess: true,
    });
    const label = formatDisplayAddressWithPolicy(stub(), "בית-1001", ctx);
    assert.match(label, /31 באוקטובר/u);
    assert.match(label, /תיחשף/u);
    assert.doesNotMatch(label, /יהודית/u);
  });

  it("admin and owner bypass before reveal when catalog access", () => {
    const ctx = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 10, 0),
      isAdmin: false,
      ownedHouseIds: ["בית-1001"],
      hasCatalogAccess: true,
    });
    assert.equal(canViewHouseLocationDetails("בית-1001", ctx), true);
    assert.equal(canViewHouseLocationDetails("בית-9999", ctx), false);

    const adminCtx = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 10, 0),
      isAdmin: true,
      hasCatalogAccess: true,
    });
    assert.equal(canViewHouseLocationDetails("בית-9999", adminCtx), true);
  });

  it("redact helper clears fields", () => {
    const next = redactHouseLocationDetails(stub());
    assert.equal(next.address, "");
    assert.equal(next.arrival, "");
  });
});
