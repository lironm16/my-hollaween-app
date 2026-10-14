import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clusterTourBackgroundStyle } from "@/lib/map-cluster-tour-fill";
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

describe("clusterTourBackgroundStyle", () => {
  it("returns null when every house is still open", () => {
    const style = clusterTourBackgroundStyle([stub("a"), stub("b")], [], []);
    assert.equal(style, null);
  });

  it("splits two houses into half/half slices", () => {
    const style = clusterTourBackgroundStyle([stub("a"), stub("b")], ["a"], ["b"]);
    assert.ok(style);
    assert.match(style!, /conic-gradient/);
    assert.match(style!, /#059669 0% 50%/);
    assert.match(style!, /#64748b 50% 100%/);
  });

  it("uses white for open and gray for skipped in a pair", () => {
    const style = clusterTourBackgroundStyle([stub("a"), stub("b")], [], ["b"]);
    assert.ok(style);
    assert.match(style!, /#fff7ed 0% 50%/);
    assert.match(style!, /#64748b 50% 100%/);
  });
});
