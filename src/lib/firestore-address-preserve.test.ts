import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { preserveStoredAddressFields } from "@/lib/firestore-address-preserve";
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

describe("preserveStoredAddressFields", () => {
  it("keeps Firestore street when incoming row is redacted", () => {
    const existing = stub({ address: "חרוזים 8", arrival: "קומה 1" });
    const incoming = stub({ address: "", arrival: "" });
    const next = preserveStoredAddressFields(incoming, existing);
    assert.equal(next.address, "חרוזים 8");
    assert.equal(next.arrival, "קומה 1");
  });

  it("allows intentional address updates", () => {
    const existing = stub({ address: "חרוזים 8" });
    const incoming = stub({ address: "רוקח 32" });
    const next = preserveStoredAddressFields(incoming, existing);
    assert.equal(next.address, "רוקח 32");
  });
});
