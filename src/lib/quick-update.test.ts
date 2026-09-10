import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildQuickUpdatePatch,
  currentQuickCandy,
  currentQuickHouse,
  previewQuickUpdatePush,
  quickUpdateChanged,
} from "@/lib/quick-update";
import type { PublicHouse } from "@/lib/types";

function house(partial: Partial<PublicHouse> = {}): PublicHouse {
  const now = "2026-10-31T12:00:00.000Z";
  return {
    id: "בית-1",
    name: "בית בדיקה",
    theme: "pumpkin",
    address: "רחוב 1",
    arrival: "",
    description: "",
    lat: 32.08,
    lng: 34.78,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "20:00",
    openHours: [{ from: "17:00", to: "20:00" }],
    openFrom2: "",
    openTo2: "",
    notes: "",
    accessible: false,
    visit: "come",
    decorLevel: "mild",
    decorated: true,
    soldOut: false,
    status: "approved",
    createdAt: now,
    updatedAt: now,
    adminFrozen: false,
    ...partial,
  } as PublicHouse;
}

describe("quick-update", () => {
  it("reads current candy and house status", () => {
    assert.equal(currentQuickCandy(house()), "plenty");
    assert.equal(currentQuickHouse(house()), "open");
    assert.equal(currentQuickHouse(house({ visit: "closed" })), "closed");
  });

  it("builds a closed patch", () => {
    const patch = buildQuickUpdatePatch(house(), "out", "closed");
    assert.equal(patch.visit, "closed");
    assert.equal(patch.treatStock?.candy, "out");
    assert.equal(patch.ownerFrozenUntil, null);
  });

  it("detects changes and previews push", () => {
    const base = house();
    assert.equal(quickUpdateChanged(base, "plenty", "open"), false);
    assert.equal(quickUpdateChanged(base, "low", "open"), true);
    const preview = previewQuickUpdatePush(base, "low", "open");
    assert.ok(preview);
    assert.match(preview!.payload.title, /בית בדיקה/);
  });

  it("previews candy out while house stays open", () => {
    const base = house({ decorLevel: "mild", decorated: true });
    const preview = previewQuickUpdatePush(base, "out", "open");
    assert.ok(preview);
    assert.equal(preview!.kind, "candyOut");
  });
});
