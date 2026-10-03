import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { houseShareSlug, resolveHouseIdFromPath, toEditorHouse, toPublicHouse } from "@/lib/ids";
import type { House } from "@/lib/types";

describe("houseShareSlug", () => {
  it("returns the numeric suffix for standard house ids", () => {
    assert.equal(houseShareSlug("בית-4948"), "4948");
  });

  it("decodes percent-encoded ids before extracting the suffix", () => {
    assert.equal(houseShareSlug("%D7%91%D7%99%D7%AA-4948"), "4948");
  });
});

describe("resolveHouseIdFromPath", () => {
  it("maps numeric path segments to catalog ids", () => {
    assert.equal(resolveHouseIdFromPath("4948"), "בית-4948");
  });

  it("keeps full ids from legacy share links", () => {
    assert.equal(resolveHouseIdFromPath("%D7%91%D7%99%D7%AA-4948"), "בית-4948");
  });
});

describe("toPublicHouse", () => {
  it("strips internal fields including addedBy", () => {
    const row = {
      id: "בית-1",
      name: "x",
      theme: "pumpkin",
      address: "a",
      arrival: "",
      description: "",
      lat: 32,
      lng: 34,
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
      editCode: "secret",
      storeId: "fs-1",
      createdAt: "",
      updatedAt: "",
      ownerPhone: "050",
      addedBy: "משפחת לוי",
    } as House;
    const pub = toPublicHouse(row);
    assert.equal("addedBy" in pub, false);
    assert.equal("ownerPhone" in pub, false);
    assert.equal("editCode" in pub, false);
  });
});

describe("toEditorHouse", () => {
  it("includes addedBy only when requested", () => {
    const row = {
      id: "בית-1",
      name: "x",
      theme: "pumpkin",
      address: "a",
      arrival: "",
      description: "",
      lat: 32,
      lng: 34,
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
      editCode: "secret",
      createdAt: "",
      updatedAt: "",
      ownerPhone: "050",
      addedBy: "משפחת לוי",
    } as House;
    assert.equal(toEditorHouse(row).addedBy, undefined);
    assert.equal(toEditorHouse(row, { includeAddedBy: true }).addedBy, "משפחת לוי");
  });
});
