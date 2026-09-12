import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isTemporarySkipReason,
  skipStatusSnapshot,
  suggestedSkipReasons,
} from "@/lib/skip-reasons";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";

function stub(overrides: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id: "a",
    name: "בית",
    theme: "pumpkin",
    address: "חרוזים 8",
    arrival: "",
    description: "",
    lat: 32.0919,
    lng: 34.8112,
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
    status: "approved",
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const baseFilters: HouseFiltersState = {
  accessibleOnly: false,
  openNowOnly: false,
  closingSoonOnly: false,
  openingSoonOnly: false,
  notYetOpenOnly: false,
  onBreakOnly: false,
  afterHoursOnly: false,
  visitWindowMode: "all",
  visitWindowFrom: "",
  visitWindowTo: "",
  closedOnly: false,
  decorOnlyOnly: false,
  sensitivityFilters: [],
  scareFilters: ["mild", "medium", "spicy"],
  candyFilters: ["none", "plenty", "low", "out"],
  neighborhoodFilters: ["חרוזים", "נחלת גנים", "שיכון ותיקים"],
  likedOnly: false,
  unvisitedOnly: false,
  visitedOnly: false,
  skippedOnly: false,
  includeUndecorated: true,
};

describe("suggestedSkipReasons", () => {
  it("suggests closed when the house is closed", () => {
    const options = suggestedSkipReasons(
      stub({ visit: "closed", soldOut: true }),
      new Date("2026-10-31T18:00:00"),
      baseFilters,
    );
    assert.equal(options[0]?.id, "closed");
  });

  it("marks status reasons as temporary-friendly", () => {
    assert.equal(isTemporarySkipReason("closed"), true);
    assert.equal(isTemporarySkipReason("other"), false);
  });
});

describe("skipStatusSnapshot", () => {
  it("changes when visit state changes", () => {
    const now = new Date("2026-10-31T18:00:00");
    const closed = stub({ visit: "closed", soldOut: true });
    const open = stub({ visit: "come", soldOut: false });
    assert.notEqual(
      skipStatusSnapshot(closed, now, baseFilters),
      skipStatusSnapshot(open, now, baseFilters),
    );
  });
});
