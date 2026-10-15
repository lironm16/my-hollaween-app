import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clusterProgressCounts,
  clusterRouteStopBadgeProgress,
  clusterTourRingDecor,
  solidTourRingColor,
  clusterTourRingGradient,
  clusterTourMixedRingGradient,
  clusterHasMixedUnitStates,
  TOUR_CLUSTER_MIXED,
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

describe("clusterProgressCounts", () => {
  it("counts visited, skipped, and open units", () => {
    const houses = [stub("a"), stub("b"), stub("c")];
    assert.deepEqual(clusterProgressCounts(houses, ["a"], ["b"]), {
      visited: 1,
      skipped: 1,
      open: 1,
    });
  });
});

describe("clusterTourRingGradient", () => {
  it("returns null when idle and every house is open", () => {
    assert.equal(clusterTourRingGradient([stub("a"), stub("b")], [], [], false), null);
  });

  it("uses solid orange when all open in route mode", () => {
    const gradient = clusterTourRingGradient([stub("a"), stub("b")], [], [], true);
    assert.match(gradient!, /#f97316 0% 100%/);
  });

  it("uses solid green when all visited", () => {
    const gradient = clusterTourRingGradient([stub("a"), stub("b")], ["a", "b"], [], false);
    assert.match(gradient!, /#059669 0% 100%/);
  });

  it("uses solid gray when all skipped", () => {
    const gradient = clusterTourRingGradient([stub("a")], [], ["a"], false);
    assert.match(gradient!, /#64748b 0% 100%/);
  });

  it("uses light brown when visit and skip both present and none open", () => {
    const gradient = clusterTourRingGradient([stub("a"), stub("b")], ["a"], ["b"], false);
    assert.equal(gradient, clusterTourMixedRingGradient());
    assert.match(gradient!, new RegExp(`${TOUR_CLUSTER_MIXED} 0% 100%`));
  });

  it("uses brown when nine visited and one skipped", () => {
    const houses = Array.from({ length: 10 }, (_, i) => stub(`u${i}`));
    const visited = houses.slice(0, 9).map((h) => h.id);
    const gradient = clusterTourRingGradient(houses, visited, ["u9"], false);
    assert.equal(gradient, clusterTourMixedRingGradient());
  });

  it("uses brown as soon as one unit is visited and others are open", () => {
    const houses = Array.from({ length: 10 }, (_, i) => stub(`u${i}`));
    const gradient = clusterTourRingGradient(houses, ["u0"], [], true);
    assert.equal(gradient, clusterTourMixedRingGradient());
  });

  it("uses open color only when every unit is still open", () => {
    const gradient = clusterTourRingGradient([stub("a"), stub("b")], [], [], true);
    assert.match(gradient!, /#f97316 0% 100%/);
  });
});

describe("clusterHasMixedUnitStates", () => {
  it("is true when visit, skip, and open mix", () => {
    assert.equal(
      clusterHasMixedUnitStates({ visited: 1, skipped: 1, open: 1 }),
      true,
    );
  });

  it("is false when all units share one state", () => {
    assert.equal(clusterHasMixedUnitStates({ visited: 2, skipped: 0, open: 0 }), false);
  });
});

describe("solidTourRingColor", () => {
  it("detects single-color conic rings", () => {
    assert.equal(
      solidTourRingColor("conic-gradient(from -90deg, #f97316 0% 100%)"),
      "#f97316",
    );
    assert.equal(
      solidTourRingColor("conic-gradient(from -90deg, #059669 0% 50%, #64748b 50% 100%)"),
      null,
    );
  });
});

describe("clusterTourRingDecor", () => {
  it("uses solid border ring when route is on and cluster is untouched", () => {
    const decor = clusterTourRingDecor([stub("a")], [], [], true);
    assert.equal(decor.classSuffix, " pin-tour-ring pin-tour-ring-solid");
    assert.match(decor.styleAttr, /--pin-tour-ring-color:#f97316/);
  });

  it("uses solid brown mixed ring when visit and skip both present", () => {
    const decor = clusterTourRingDecor([stub("a"), stub("b")], ["a"], ["b"], true);
    assert.equal(decor.classSuffix, " pin-tour-ring pin-tour-ring-solid");
    assert.match(decor.styleAttr, new RegExp(`--pin-tour-ring-color:${TOUR_CLUSTER_MIXED}`));
  });
});

describe("clusterRouteStopBadgeProgress", () => {
  it("uses mixed when inner units disagree", () => {
    const houses = [stub("a"), stub("b")];
    assert.equal(clusterRouteStopBadgeProgress(houses, ["a"], []), "mixed");
    assert.equal(clusterRouteStopBadgeProgress(houses, ["a", "b"], []), "visited");
    assert.equal(clusterRouteStopBadgeProgress(houses, ["a"], ["b"]), "mixed");
  });
});
