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

  it("emits one ring slice per cluster house (not capped)", () => {
    const houses = Array.from({ length: 12 }, (_, index) => stub(`u${index}`));
    const gradient = clusterTourRingGradient(houses, ["u0"], ["u1"], true);
    assert.ok(gradient);
    assert.match(gradient!, /#059669 0% 8\.333333333333334%/);
    assert.match(gradient!, /#64748b 8\.333333333333334% 16\.666666666666668%/);
    assert.match(gradient!, /16\.666666666666668% 25%/);
    assert.match(gradient!, /91\.66666666666667% 100%/);
  });
});

describe("clusterTourRingDecor", () => {
  it("uses tour ring styling when route is on and cluster is untouched", () => {
    const decor = clusterTourRingDecor([stub("a")], [], [], true);
    assert.equal(decor.classSuffix, " pin-tour-ring");
    assert.match(decor.styleAttr, /#f97316/);
  });
});
