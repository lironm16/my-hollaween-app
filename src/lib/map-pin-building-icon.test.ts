import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildingClusterIconKind,
  buildingClusterPinClass,
  pinBuildingClusterIconHtml,
} from "@/lib/map-pin-building-icon";
import type { PublicHouse } from "@/lib/types";

function house(id: string, patch: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id,
    name: `מקום ${id}`,
    theme: "pumpkin",
    address: "חרוזים 8",
    arrival: id,
    description: "",
    lat: 32.09,
    lng: 34.8,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    openHours: [{ from: "17:00", to: "21:00" }],
    notes: "",
    accessible: false,
    visit: "come",
    decorLevel: "medium",
    decorated: true,
    soldOut: false,
    createdAt: "2026-10-31T12:00:00.000Z",
    updatedAt: "2026-10-31T12:00:00.000Z",
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    ...patch,
  };
}

describe("buildingClusterIconKind", () => {
  it("returns null for a single listing", () => {
    assert.equal(buildingClusterIconKind([house("a")]), null);
  });

  it("uses twin ghosts when more than one house shares the address", () => {
    assert.equal(buildingClusterIconKind([house("a"), house("b")]), "houses");
    assert.equal(
      buildingClusterIconKind([house("a"), house("b"), house("c")]),
      "houses",
    );
  });

  it("uses twin pumpkins when more than one business shares the address", () => {
    assert.equal(
      buildingClusterIconKind([
        house("a", { kind: "poi" }),
        house("b", { kind: "poi" }),
      ]),
      "businesses",
    );
  });

  it("uses ghost and pumpkin when both kinds are present", () => {
    assert.equal(
      buildingClusterIconKind([house("a"), house("b", { kind: "poi" })]),
      "mixed",
    );
    assert.equal(
      buildingClusterIconKind([
        house("a"),
        house("b"),
        house("c", { kind: "poi" }),
        house("d", { kind: "poi" }),
      ]),
      "mixed",
    );
  });
});

describe("pinBuildingClusterIconHtml", () => {
  it("renders spaced PNG pairs for each cluster kind", () => {
    const houses = [house("a"), house("b")];
    const html = pinBuildingClusterIconHtml(houses);
    assert.match(html, /pin-cluster-houses/);
    assert.match(html, /pin-cluster-art/);
    assert.match(html, /pin-cluster-ghosts\.png/);
  });

  it("tags all cluster pins with the shared vertical ellipse class", () => {
    assert.match(buildingClusterPinClass("mixed"), /is-cluster-ellipse/);
    assert.match(buildingClusterPinClass("houses"), /is-cluster-ellipse/);
  });
});
