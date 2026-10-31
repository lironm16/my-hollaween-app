import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addressRevealTime,
  canViewHouseLocationDetails,
  clusterDisplayAddressWithPolicy,
  formatDisplayAddressWithPolicy,
  isAddressRevealed,
  makeAddressRevealContext,
  publicHouseForCatalog,
  redactHouseLocationDetails,
  visibleArrivalWithPolicy,
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
    const schedule = { hour: 12, minute: 0 };
    const before = new Date(addressRevealTime(schedule).getTime() - 60_000);
    const at = addressRevealTime(schedule);
    assert.equal(isAddressRevealed(before, schedule), false);
    assert.equal(isAddressRevealed(at, schedule), true);
  });

  it("honors admin schedule override", () => {
    const schedule = { hour: 18, minute: 0 };
    const before = new Date(2026, 9, 31, 17, 59);
    const after = new Date(2026, 9, 31, 18, 0);
    assert.equal(isAddressRevealed(before, schedule), false);
    assert.equal(isAddressRevealed(after, schedule), true);
  });

  it("redacts catalog houses before reveal", () => {
    const house = stub({ notes: "יש כלב" });
    const redacted = publicHouseForCatalog(house, new Date(2026, 9, 31, 11, 59));
    assert.equal(redacted.address, "");
    assert.equal(redacted.arrival, "");
    assert.equal(redacted.notes, "");
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

  it("admin sees street and stored hood on one line before reveal", () => {
    const adminCtx = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 10, 0),
      isAdmin: true,
    });
    const label = formatDisplayAddressWithPolicy(
      stub({ address: "רוקח 32", neighborhood: "שיכון ותיקים" }),
      "בית-9999",
      adminCtx,
    );
    assert.equal(label, "רוקח 32, שיכון ותיקים");
  });

  it("after reveal, public sees stored hood only (no street)", () => {
    const ctx = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 20, 0),
      isAdmin: false,
    });
    const label = formatDisplayAddressWithPolicy(
      stub({ address: "סטרומה 4", neighborhood: "נחלת גנים" }),
      "בית-8975",
      ctx,
    );
    assert.equal(label, "נחלת גנים");
    assert.doesNotMatch(label, /סטרומה/u);
  });

  it("after reveal, public never sees arrival text", () => {
    const ctx = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 20, 0),
      isAdmin: false,
    });
    assert.equal(visibleArrivalWithPolicy(stub({ arrival: "קומה 2" }), "בית-1001", ctx), "");
    const adminCtx = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 20, 0),
      isAdmin: true,
    });
    assert.equal(
      visibleArrivalWithPolicy(stub({ arrival: "קומה 2" }), "בית-1001", adminCtx),
      "קומה 2",
    );
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

  it("night passes: unregistered never opens homes and gets the registered-users hint", () => {
    const ctx = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 20, 0),
      isAdmin: false,
      audience: "none",
    });
    assert.equal(canViewHouseLocationDetails("בית-1001", ctx), false);
    const label = formatDisplayAddressWithPolicy(stub(), "בית-1001", ctx);
    assert.match(label, /הכתובת תיחשף למכשירים רשומים/u);
    assert.doesNotMatch(label, /יהודית/u);
  });

  it("night passes: registered keeps the event-night hint, then opens", () => {
    const before = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 10, 0),
      audience: "registered",
    });
    assert.match(formatDisplayAddressWithPolicy(stub(), "בית-1001", before), /31 באוקטובר/u);
    const after = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 20, 0),
      audience: "registered",
    });
    assert.equal(canViewHouseLocationDetails("בית-1001", after), true);
  });

  it("night passes: businesses / schools open for everyone", () => {
    const ctx = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 10, 0),
      audience: "none",
      publicLocationIds: ["נק-1"],
    });
    assert.equal(canViewHouseLocationDetails("נק-1", ctx), true);
  });

  it("cluster header uses a visible member's address while its homes stay hidden", () => {
    const ctx = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 10, 0),
      audience: "registered",
      publicLocationIds: ["נק-1"],
    });
    const home = stub({ id: "בית-1", address: "" });
    const business = stub({ id: "נק-1", kind: "poi", address: "הגפן 3" });
    assert.equal(clusterDisplayAddressWithPolicy([home, business], home, ctx), "הגפן 3, חרוזים");
    assert.doesNotMatch(formatDisplayAddressWithPolicy(home, home.id, ctx), /הגפן/);
    const homesOnly = clusterDisplayAddressWithPolicy([home], home, ctx);
    assert.equal(homesOnly, formatDisplayAddressWithPolicy(home, home.id, ctx));
  });

  it("redact helper clears fields", () => {
    const next = redactHouseLocationDetails(stub({ notes: "יש כלב" }));
    assert.equal(next.address, "");
    assert.equal(next.arrival, "");
    assert.equal(next.notes, "");
  });
});
