import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeVisibleHouses } from "@/hooks/use-merged-houses";
import { houseMatchesSet } from "@/lib/house-set";
import type { House, PublicHouse } from "@/lib/types";

function publicHouse(id: string, updatedAt: string): PublicHouse {
  return {
    id,
    name: `בית ${id}`,
    theme: "pumpkin",
    address: "חרוזים",
    arrival: "",
    description: "",
    lat: 32.09,
    lng: 34.81,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    visit: "come",
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    notes: "",
    accessible: false,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    createdAt: updatedAt,
    updatedAt,
  } as PublicHouse;
}

function adminHouse(id: string, updatedAt: string): House {
  return {
    ...publicHouse(id, updatedAt),
    editCode: "123456",
  } as House;
}

describe("mergeVisibleHouses", () => {
  it("includes catalog and admin houses when includeCatalogWhenAdmin is true", () => {
    const merged = mergeVisibleHouses({
      catalogHouses: [publicHouse("catalog-only", "2026-10-31T10:00:00.000Z")],
      owned: [],
      admin: true,
      adminHouses: [adminHouse("admin-only", "2026-10-31T10:00:00.000Z")],
      includeCatalogWhenAdmin: true,
    });
    assert.deepEqual(merged.map((house) => house.id).sort(), ["admin-only", "catalog-only"]);
  });

  it("uses admin houses only on the map when includeCatalogWhenAdmin is false", () => {
    const merged = mergeVisibleHouses({
      catalogHouses: [publicHouse("catalog-only", "2026-10-31T10:00:00.000Z")],
      owned: [],
      admin: true,
      adminHouses: [adminHouse("admin-only", "2026-10-31T10:00:00.000Z")],
    });
    assert.deepEqual(merged.map((house) => house.id), ["admin-only"]);
  });

  it("keeps addedBy on admin merge for internal submitter name", () => {
    const merged = mergeVisibleHouses({
      catalogHouses: [publicHouse("בית-2000", "2026-10-31T10:00:00.000Z")],
      owned: [],
      admin: true,
      adminHouses: [
        {
          ...adminHouse("בית-2000", "2026-10-31T12:00:00.000Z"),
          addedBy: "משפחת כהן",
        },
      ],
      includeCatalogWhenAdmin: true,
    });
    const house = merged.find((item) => item.id === "בית-2000") as { addedBy?: string };
    assert.equal(house?.addedBy, "משפחת כהן");
  });

  it("keeps ownerPhone on admin merge for internal contact", () => {
    const merged = mergeVisibleHouses({
      catalogHouses: [publicHouse("בית-1847", "2026-10-31T10:00:00.000Z")],
      owned: [],
      admin: true,
      adminHouses: [
        {
          ...adminHouse("בית-1847", "2026-10-31T12:00:00.000Z"),
          ownerPhone: "0501112233",
        },
      ],
      includeCatalogWhenAdmin: true,
    });
    const house = merged.find((item) => item.id === "בית-1847") as { ownerPhone?: string };
    assert.equal(house?.ownerPhone, "0501112233");
  });

  it("keeps stub identity when admin API row drops rehearsal description", () => {
    const catalogStub: PublicHouse = {
      ...publicHouse("בית-1847", "2026-10-31T10:00:00.000Z"),
      description: "סטאב לחזרה — דלעות על המדרגה.",
      photoUrl: "/images/stubs/pumpkin-porch.jpg",
      address: "",
    };
    const adminRow: House = {
      ...adminHouse("בית-1847", "2026-10-31T12:00:00.000Z"),
      description: "",
      address: "חרוזים 8",
      photoUrl: "",
    };
    const merged = mergeVisibleHouses({
      catalogHouses: [catalogStub],
      owned: [],
      admin: true,
      adminHouses: [adminRow],
      includeCatalogWhenAdmin: true,
    });
    const house = merged.find((item) => item.id === "בית-1847");
    assert.ok(house);
    assert.equal(houseMatchesSet(house!, "real"), false);
    assert.equal(houseMatchesSet(house!, "stubs"), true);
  });

  it("keeps full address when admin owned preview is redacted", () => {
    const merged = mergeVisibleHouses({
      catalogHouses: [],
      owned: [
        {
          id: "a",
          name: "בית",
          editCode: "111111",
          preview: {
            ...publicHouse("a", "2026-10-31T12:00:00.000Z"),
            address: "",
            arrival: "",
          },
        },
      ],
      admin: true,
      adminHouses: [
        adminHouse("a", "2026-10-31T10:00:00.000Z"),
      ],
      includeCatalogWhenAdmin: true,
    });
    const house = merged.find((item) => item.id === "a");
    assert.equal(house?.address, "חרוזים");
  });
});
