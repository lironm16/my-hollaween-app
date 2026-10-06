import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergePublicHouseWithAdminRow } from "@/lib/admin-house-overlay";
import type { House, PublicHouse } from "@/lib/types";

function publicRow(id: string): PublicHouse {
  return {
    id,
    name: "Test",
    theme: "pumpkin",
    address: "",
    arrival: "",
    description: "",
    lat: 32.09,
    lng: 34.81,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
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
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
  };
}

function adminRow(id: string): House {
  return {
    ...publicRow(id),
    editCode: "123456",
    address: "רוקח 32",
    arrival: "כניסה מהחצר",
    ownerPhone: "0501234567",
    addedBy: "משפחת לוי",
  };
}

describe("mergePublicHouseWithAdminRow", () => {
  it("fills redacted fields and contact from admin row", () => {
    const merged = mergePublicHouseWithAdminRow(publicRow("בית-1"), adminRow("בית-1"));
    assert.equal(merged.address, "רוקח 32");
    assert.equal(merged.arrival, "כניסה מהחצר");
    assert.equal(merged.ownerPhone, "0501234567");
    assert.equal(merged.addedBy, "משפחת לוי");
  });
});
