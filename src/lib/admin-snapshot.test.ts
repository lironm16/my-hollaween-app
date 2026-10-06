import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSnapshotStats } from "@/lib/admin-snapshot";
import type { PublicHouse } from "@/lib/types";

function house(id: string, patch: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id,
    name: `בית ${id}`,
    theme: "pumpkin",
    address: "חרוזים",
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
    notes: "",
    accessible: false,
    soldOut: false,
    adminFrozen: false,
    updatedAt: "2026-10-31T12:00:00.000Z",
    ...patch,
  } as PublicHouse;
}

const openEvening = new Date(2026, 9, 31, 18, 30, 0, 0);

describe("buildSnapshotStats", () => {
  it("counts listed houses and open-now from catalog data only", () => {
    const stats = buildSnapshotStats({
      houses: [
        house("a", { visit: "come", openFrom: "17:00", openTo: "21:00" }),
        house("b", { visit: "closed", openFrom: "17:00", openTo: "21:00" }),
        house("בית-9310", { isStub: true }),
      ],
      now: openEvening,
      houseSet: "real",
    });

    assert.equal(stats.houses, 2);
    assert.equal(stats.openNow, 1);
    assert.equal(stats.closed, 1);
  });

  it("counts houses and pois separately on the map", () => {
    const stats = buildSnapshotStats({
      houses: [
        house("a"),
        house("b"),
        house("poi-1", { kind: "poi", poiCategory: "coffee" }),
      ],
      now: openEvening,
    });

    assert.equal(stats.houses, 2);
    assert.equal(stats.pois, 1);
  });

  it("aggregates candy and sensitivity counts", () => {
    const stats = buildSnapshotStats({
      houses: [
        house("a", { treatStock: { candy: "plenty" }, treats: ["candy", "glutenFree"] }),
        house("b", { treatStock: { candy: "low" }, treats: ["candy", "nutsFree"] }),
        house("c", { visit: "decorOnly", decorLevel: "none", treats: [] }),
      ],
      now: openEvening,
    });

    assert.equal(stats.candyPlenty, 1);
    assert.equal(stats.candyLow, 1);
    assert.equal(stats.candyNone, 1);
    assert.equal(stats.glutenFree, 1);
    assert.equal(stats.nutsFree, 1);
    assert.equal(stats.notDecorated, 1);
  });

  it("counts houses per neighborhood and other", () => {
    const stats = buildSnapshotStats({
      houses: [
        house("a", { address: "חרוזים 8", neighborhood: "חרוזים", lat: 32.0916477, lng: 34.8028691 }),
        house("b", {
          address: "המרגנית 1",
          neighborhood: "שיכון ותיקים",
          lat: 32.0945618,
          lng: 34.816518,
        }),
        house("c", { address: "יוהנה 6", neighborhood: null, lat: 32.0883058, lng: 34.8163387 }),
      ],
      now: openEvening,
    });

    assert.equal(stats.neighborhoods.חרוזים, 1);
    assert.equal(stats.neighborhoods["שיכון ותיקים"], 1);
    assert.equal(stats.neighborhoods.other, 1);
  });
});
