import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { houseMapsUrl } from "@/lib/nav-links";
import type { PublicHouse } from "@/lib/types";

function stub(overrides: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id: "בית-test",
    name: "משפחת גולן",
    theme: "pumpkin",
    address: "יהודית 15, חרוזים",
    arrival: "",
    description: "",
    lat: 32.089223,
    lng: 34.804374,
    treats: [],
    treatStock: {},
    visit: "come",
    scareLevel: "mild",
    openFrom: "",
    openTo: "",
    openHours: [],
    openFrom2: "",
    openTo2: "",
    notes: "",
    accessible: false,
    decorLevel: "none",
    decorated: false,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("houseMapsUrl", () => {
  it("uses stored coordinates when available", () => {
    const url = houseMapsUrl(stub());
    assert.match(url, /destination=32\.089223,34\.804374/);
    assert.doesNotMatch(url, /יהודית/);
  });

  it("falls back to address text when coordinates are missing", () => {
    const url = houseMapsUrl(stub({ lat: NaN, lng: NaN }));
    const destination = decodeURIComponent(new URL(url).searchParams.get("destination") ?? "");
    assert.match(destination, /יהודית 15/);
  });
});
