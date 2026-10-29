import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  anomalyDetectionContextFromDb,
  detectHouseAnomalies,
  isAnomalyActionable,
  reconcileHouseAnomalyReviews,
} from "@/lib/house-anomalies";
import { listAllActionableAnomalies } from "@/lib/house-anomalies";
import type { House } from "@/lib/types";

function house(overrides: Partial<House> = {}): House {
  return {
    id: "בית-1001",
    name: "בית המפלצות",
    theme: "pumpkin",
    address: "חרוזים 8",
    arrival: "כניסה מהחצר",
    description: "",
    lat: 32.0919,
    lng: 34.8112,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    visit: "come",
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "20:00",
    openHours: [{ from: "17:00", to: "20:00" }],
    notes: "",
    accessible: false,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    editCode: "123456",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("house-anomalies", () => {
  const ctx = anomalyDetectionContextFromDb({});

  it("flags very short and early-morning hours", () => {
    const h = house({
      openHours: [{ from: "05:00", to: "05:20" }],
      openFrom: "05:00",
      openTo: "05:20",
    });
    const found = detectHouseAnomalies(h, [h], ctx);
    assert.ok(found.some((a) => a.kind === "hours_very_short"));
    assert.ok(found.some((a) => a.kind === "hours_early_morning"));
    assert.ok(found.some((a) => a.kind === "hours_outside_event"));
  });

  it("flags high floor only when not accessible", () => {
    const low = house({ arrival: "קומה 2, דירה 5" });
    assert.equal(
      detectHouseAnomalies(low, [low], ctx).some((a) => a.kind === "arrival_high_floor"),
      false,
    );
    const highNotAccessible = house({
      arrival: "קומה 5, דירה 18, מעלית ואז ימינה",
      accessible: false,
    });
    assert.ok(
      detectHouseAnomalies(highNotAccessible, [highNotAccessible], ctx).some(
        (a) => a.kind === "arrival_high_floor",
      ),
    );
    const highAccessible = house({
      arrival: "קומה 5, דירה 18",
      accessible: true,
    });
    assert.equal(
      detectHouseAnomalies(highAccessible, [highAccessible], ctx).some(
        (a) => a.kind === "arrival_high_floor",
      ),
      false,
    );
  });

  it("flags lobby or entrance mention when house is not accessible", () => {
    const accessible = house({
      accessible: true,
      arrival: "Lobby entrance, ground floor",
    });
    assert.equal(
      detectHouseAnomalies(accessible, [accessible], ctx).some(
        (a) => a.kind === "mentions_lobby_entrance_not_accessible",
      ),
      false,
    );
    const flagged = house({
      accessible: false,
      description: "Trick-or-treat at the lobby entrance",
    });
    assert.ok(
      detectHouseAnomalies(flagged, [flagged], ctx).some(
        (a) => a.kind === "mentions_lobby_entrance_not_accessible",
      ),
    );
    const yardOnly = house({
      accessible: false,
      arrival: "קומה 2, דירה 5, כניסה מהחצר",
    });
    assert.equal(
      detectHouseAnomalies(yardOnly, [yardOnly], ctx).some(
        (a) => a.kind === "mentions_lobby_entrance_not_accessible",
      ),
      false,
    );
  });

  it("flags name that looks like an address", () => {
    const h = house({ name: "חרוזים 12" });
    assert.ok(detectHouseAnomalies(h, [h], ctx).some((a) => a.kind === "name_looks_like_address"));
  });

  it("respects admin review until house changes", () => {
    const h = house({
      name: "חרוזים 12",
      updatedAt: "2026-10-02T00:00:00.000Z",
      adminAnomalyReviews: {
        name_looks_like_address: {
          status: "not_an_issue",
          reviewedAt: "2026-10-01T12:00:00.000Z",
          houseUpdatedAt: "2026-10-02T00:00:00.000Z",
        },
      },
    });
    const anomaly = detectHouseAnomalies(h, [h], ctx).find((a) => a.kind === "name_looks_like_address")!;
    assert.equal(isAnomalyActionable(h, anomaly), false);
    const newer = { ...h, updatedAt: "2026-10-03T00:00:00.000Z" };
    assert.equal(isAnomalyActionable(newer, anomaly), true);
  });

  it("flags similar apartments in the same building cluster", () => {
    const shared = { lat: 32.0919, lng: 34.8112, address: "חרוזים 8" };
    const a = house({
      id: "בית-3001",
      ...shared,
      name: "דירת הדלעות",
      arrival: "קומה 2, דירה 5",
      addedBy: "משפחת לוי",
    });
    const b = house({
      id: "בית-3002",
      ...shared,
      name: "דירת דלעות",
      arrival: "דירה 5, קומה 2",
      addedBy: "משפחת לוי",
    });
    const items = listAllActionableAnomalies([a, b], ctx, { houseSet: "all" });
    const dupes = items.filter((i) => i.kind === "duplicate_apartment_suspected");
    assert.equal(dupes.length, 1);
    assert.equal(dupes[0]?.affectedHouseIds?.length, 2);
  });

  it("dedupes building accessibility to one row per cluster", () => {
    const shared = { lat: 32.0919, lng: 34.8112, address: "חרוזים 8" };
    const a = house({
      id: "בית-2001",
      ...shared,
      accessible: true,
      name: "א",
    });
    const b = house({
      id: "בית-2002",
      ...shared,
      accessible: false,
      name: "ב",
    });
    const items = listAllActionableAnomalies([a, b], ctx, { houseSet: "all" });
    const mismatches = items.filter((i) => i.kind === "building_accessible_mismatch");
    assert.equal(mismatches.length, 1);
    assert.equal(mismatches[0]?.affectedHouseIds?.length, 2);
  });

  it("clears stale reviews when issue is fixed", () => {
    const withReview = house({
      name: "בית חמוד",
      adminAnomalyReviews: {
        name_looks_like_address: {
          status: "fixed",
          reviewedAt: "2026-10-01T12:00:00.000Z",
          houseUpdatedAt: "2026-10-01T00:00:00.000Z",
        },
      },
    });
    const reconciled = reconcileHouseAnomalyReviews(withReview, [withReview], ctx);
    assert.equal(reconciled.adminAnomalyReviews, undefined);
  });
});
