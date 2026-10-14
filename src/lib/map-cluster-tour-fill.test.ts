import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clusterTourRingDecor,
  clusterTourRingGradient,
} from "@/lib/map-cluster-tour-fill";
import type { PublicHouse } from "@/lib/types";

function stub(id: string): PublicHouse {
  return {
    id,
    name: id,
    theme: "pumpkin",
    address: "",
    neighborhood: "חרוזים",
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
    openHours: [{ from: "17:00", to: "21:00" }],
    openFrom2: "",
    openTo2: "",
    notes: "",
    accessible: true,
    decorLevel: "medium",
    decorated: true,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    createdAt: "",
    updatedAt: "",
  };
}

describe("clusterTourRingGradient", () => {
  it("returns null when idle and every house is open", () => {
    assert.equal(clusterTourRingGradient([stub("a"), stub("b")], [], [], false), null);
  });

  it("uses orange for all-open clusters while route mode is on", () => {
    const gradient = clusterTourRingGradient([stub("a")], [], [], true);
    assert.match(gradient!, /#f97316/);
  });

  it("splits visit/skip on the ring with white open slices off-route", () => {
    const gradient = clusterTourRingGradient([stub("a"), stub("b")], ["a"], ["b"], false);
    assert.ok(gradient);
    assert.match(gradient!, /#059669 0% 50%/);
    assert.match(gradient!, /#64748b 50% 100%/);
  });

  it("uses orange instead of white for open slices in route mode", () => {
    const gradient = clusterTourRingGradient([stub("a"), stub("b")], [], ["b"], true);
    assert.ok(gradient);
    assert.match(gradient!, /#f97316 0% 50%/);
    assert.match(gradient!, /#64748b 50% 100%/);
  });
});

describe("clusterTourRingDecor", () => {
  it("uses tour ring styling when route is on and cluster is untouched", () => {
    const decor = clusterTourRingDecor([stub("a")], [], [], true);
    assert.equal(decor.classSuffix, " pin-tour-ring");
    assert.match(decor.styleAttr, /#f97316/);
  });
});
