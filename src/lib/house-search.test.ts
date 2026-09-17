import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { houseMatchesQuery } from "@/components/house-picker";
import type { PublicHouse } from "@/lib/types";

function house(name: string, address = "חרוזים 8"): PublicHouse {
  return {
    id: "בית-1",
    name,
    theme: "pumpkin",
    address,
    arrival: "",
    description: "",
    lat: 32.09,
    lng: 34.8,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    visit: "come",
    notes: "",
    accessible: false,
    soldOut: false,
    adminFrozen: false,
    updatedAt: "2026-10-31T12:00:00.000Z",
  } as PublicHouse;
}

describe("houseMatchesQuery", () => {
  it("matches by name or address", () => {
    const sample = house("בית משפחת לוי", "יהודית 15");
    assert.equal(houseMatchesQuery(sample, "לוי"), true);
    assert.equal(houseMatchesQuery(sample, "יהודית"), true);
    assert.equal(houseMatchesQuery(sample, "אין כזה"), false);
  });
});
