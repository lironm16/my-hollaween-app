import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { preserveStoredHouseFields } from "@/lib/firestore-address-preserve";
import type { House } from "@/lib/types";

function stub(partial: Partial<House>): House {
  return {
    id: "בית-0001",
    name: "test",
    theme: "pumpkin",
    address: "",
    arrival: "",
    description: "",
    lat: 32.08,
    lng: 34.81,
    treats: [],
    treatStock: {},
    visit: "come",
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    openHours: [],
    openFrom2: "",
    openTo2: "",
    notes: "",
    accessible: false,
    decorLevel: "medium",
    decorated: true,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    editCode: "123456",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("preserveStoredHouseFields", () => {
  it("keeps Firestore street/arrival when incoming row is redacted", () => {
    const existing = stub({ address: "חרוזים 8", arrival: "קומה 1" });
    const incoming = stub({ address: "", arrival: "" });
    const next = preserveStoredHouseFields(incoming, existing);
    assert.equal(next.address, "חרוזים 8");
    assert.equal(next.arrival, "קומה 1");
  });

  it("keeps ownerPhone and addedBy when stripped from incoming", () => {
    const existing = stub({
      ownerPhone: "0501234567",
      addedBy: "פרל",
      editCode: "999888",
    });
    const incoming = stub({ ownerPhone: null, addedBy: null, editCode: "" });
    const next = preserveStoredHouseFields(incoming, existing);
    assert.equal(next.ownerPhone, "0501234567");
    assert.equal(next.addedBy, "פרל");
    assert.equal(next.editCode, "999888");
  });

  it("allows intentional address updates", () => {
    const existing = stub({ address: "חרוזים 8" });
    const incoming = stub({ address: "רוקח 32" });
    const next = preserveStoredHouseFields(incoming, existing);
    assert.equal(next.address, "רוקח 32");
  });

  it("always applies incoming updatedAt", () => {
    const existing = stub({ updatedAt: "2026-01-01T00:00:00.000Z" });
    const incoming = stub({ updatedAt: "2026-02-01T00:00:00.000Z", address: "" });
    const next = preserveStoredHouseFields(incoming, existing);
    assert.equal(next.updatedAt, "2026-02-01T00:00:00.000Z");
  });
});
