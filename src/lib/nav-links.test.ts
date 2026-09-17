import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatMapsAddress } from "@/lib/config";
import { houseMapsUrl, houseSharePath, houseShareUrl } from "@/lib/nav-links";
import type { PublicHouse } from "@/lib/types";

function stub(overrides: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id: "בית-test",
    name: "משפחת גולן",
    theme: "pumpkin",
    address: "יהודית 15",
    neighborhood: "חרוזים",
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

describe("formatMapsAddress", () => {
  it("omits neighborhood name from maps destination", () => {
    assert.equal(formatMapsAddress(stub()), "יהודית 15, רמת גן");
  });
});

describe("houseMapsUrl", () => {
  it("navigates with street and city only", () => {
    const destination = decodeURIComponent(
      new URL(houseMapsUrl(stub())).searchParams.get("destination") ?? "",
    );
    assert.equal(destination, "יהודית 15, רמת גן");
    assert.doesNotMatch(destination, /חרוזים/);
  });

  it("ROUTE-05 opens Google Maps walking directions", () => {
    const url = new URL(houseMapsUrl(stub()));
    assert.equal(url.hostname, "www.google.com");
    assert.equal(url.searchParams.get("travelmode"), "walking");
    assert.ok(url.pathname.includes("/maps/dir"));
  });

  it("falls back to coordinates when maps address is empty", () => {
    const url = houseMapsUrl(stub({ address: "", lat: 32.09, lng: 34.8 }));
    assert.match(url, /destination=32\.09,34\.8/);
  });
});

describe("houseSharePath", () => {
  it("builds a stable house detail path", () => {
    assert.equal(houseSharePath(stub({ id: "בית-test" })), "/house/%D7%91%D7%99%D7%AA-test");
  });
});

describe("houseShareUrl", () => {
  it("returns the path when window is unavailable", () => {
    assert.equal(houseShareUrl(stub({ id: "בית-test" })), "/house/%D7%91%D7%99%D7%AA-test");
  });
});
