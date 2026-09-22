import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { changedRehearsalStubs } from "@/lib/rehearsal-stub-overlays";
import type { DbFile, House } from "@/lib/types";

function stub(id: string, updatedAt: string, candy: "plenty" | "out" = "plenty"): House {
  return {
    id,
    name: id,
    theme: "ghost",
    address: "חרוזים 10",
    arrival: "",
    description: "סטאב לחזרה — בדיקה.",
    lat: 32.09,
    lng: 34.8,
    treats: ["candy"],
    treatStock: { candy },
    visit: "come",
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    notes: "",
    accessible: true,
    decorLevel: "medium",
    decorated: true,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    editCode: "000000",
    createdAt: updatedAt,
    updatedAt,
  };
}

describe("changedRehearsalStubs", () => {
  it("detects candy stock changes on rehearsal stubs only", () => {
    const prev: DbFile = {
      updatedAt: "2026-10-31T16:00:00.000Z",
      houses: [stub("בית-9310", "2026-10-31T16:00:00.000Z", "plenty")],
    };
    const next: DbFile = {
      updatedAt: "2026-10-31T18:00:00.000Z",
      houses: [stub("בית-9310", "2026-10-31T18:00:00.000Z", "out")],
    };
    const changes = changedRehearsalStubs(prev, next);
    assert.equal(changes.length, 1);
    assert.equal(changes[0]?.id, "בית-9310");
    assert.equal(changes[0]?.treatStock?.candy, "out");
  });

  it("ignores real house edits", () => {
    const real = stub("real-1", "2026-10-31T18:00:00.000Z");
    real.description = "בית אמיתי";
    const prev: DbFile = { updatedAt: real.updatedAt, houses: [real] };
    const next: DbFile = {
      updatedAt: "2026-10-31T19:00:00.000Z",
      houses: [{ ...real, updatedAt: "2026-10-31T19:00:00.000Z", treatStock: { candy: "out" } }],
    };
    assert.equal(changedRehearsalStubs(prev, next).length, 0);
  });
});
