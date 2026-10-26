import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { housesChangedForFirestorePersist } from "@/lib/firestore-changed-houses";
import type { House } from "@/lib/types";

function stub(partial: Partial<House> & Pick<House, "id">): House {
  return {
    name: "test",
    theme: "pumpkin",
    address: "",
    arrival: "",
    description: "",
    lat: 32.08,
    lng: 34.81,
    treats: [],
    treatStock: {},
    visit: "come",
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    notes: "",
    accessible: false,
    decorLevel: "medium",
    decorated: true,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...partial,
  };
}

describe("housesChangedForFirestorePersist", () => {
  it("includes rows when only adminAnomalyReviews changed", () => {
    const prev = [
      stub({
        id: "בית-1001",
        adminAnomalyReviews: undefined,
      }),
    ];
    const next = [
      stub({
        id: "בית-1001",
        adminAnomalyReviews: {
          hours_invalid: {
            status: "fixed",
            reviewedAt: "2026-10-02T12:00:00.000Z",
            houseUpdatedAt: "2026-10-01T00:00:00.000Z",
          },
        },
      }),
    ];
    const dirty = housesChangedForFirestorePersist(prev, next);
    assert.equal(dirty.length, 1);
    assert.equal(dirty[0]?.id, "בית-1001");
  });
});
