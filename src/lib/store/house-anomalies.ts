import {
  anomalyDetectionContextFromDb,
  listAllActionableAnomalies,
  reconcileHouseAnomalyReviews,
  type AnomalyListItem,
} from "@/lib/house-anomalies";
import { canonicalHouseId, sameHouseId } from "@/lib/ids";
import { isHouseDeleted } from "@/lib/house-state";
import type { House, HouseAnomalyKind, HouseAnomalyReviewStatus } from "@/lib/types";
import { firestoreConfigured, writeFirestoreHouse } from "@/lib/firestore-db";
import { loadDb, runSyncedWrite } from "./core";

export type AdminAnomaliesResponse = {
  items: AnomalyListItem[];
  eventOpenHours: ReturnType<typeof anomalyDetectionContextFromDb>["eventOpenHours"];
  scannedAt: string;
  houseCount: number;
};

export async function listAdminHouseAnomalies(): Promise<AdminAnomaliesResponse> {
  const db = await loadDb();
  const ctx = anomalyDetectionContextFromDb(db);
  const active = db.houses.filter((h) => !isHouseDeleted(h) && !h.isPractice);
  return {
    items: listAllActionableAnomalies(active, ctx),
    eventOpenHours: ctx.eventOpenHours,
    scannedAt: new Date().toISOString(),
    houseCount: active.length,
  };
}

export async function saveHouseAnomalyReview(input: {
  houseId: string;
  kind: HouseAnomalyKind;
  status: HouseAnomalyReviewStatus;
  note?: string;
}): Promise<{ ok: true } | { error: string }> {
  const docId = canonicalHouseId(input.houseId);
  if (!docId) return { error: "missing" };

  const updated = await runSyncedWrite((db) => {
    const house = findHouseInDb(db, docId);
    if (!house || isHouseDeleted(house)) return null;
    const reviews = { ...(house.adminAnomalyReviews ?? {}) };
    reviews[input.kind] = {
      status: input.status,
      reviewedAt: new Date().toISOString(),
      houseUpdatedAt: house.updatedAt,
      ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    };
    house.adminAnomalyReviews = reviews;
    return house;
  });

  if (!updated) return { error: "missing" };

  if (firestoreConfigured()) {
    await writeFirestoreHouse(updated);
  }
  return { ok: true };
}

/** Run after every house create/update — drop reviews for resolved issues. */
export async function refreshHouseAnomalyState(house: House): Promise<House> {
  const db = await loadDb();
  const active = db.houses.filter((h) => !isHouseDeleted(h) && !h.isPractice);
  const ctx = anomalyDetectionContextFromDb(db);
  const reconciled = reconcileHouseAnomalyReviews(house, active, ctx);
  if (reconciled.adminAnomalyReviews === house.adminAnomalyReviews) return house;

  const saved = await runSyncedWrite((file) => {
    const row = findHouseInDb(file, house.id);
    if (!row || !sameHouseId(row.id, house.id)) return null;
    row.adminAnomalyReviews = reconciled.adminAnomalyReviews;
    return row;
  });

  if (saved && firestoreConfigured()) {
    await writeFirestoreHouse(saved);
  }
  return reconciled;
}

function findHouseInDb(db: { houses: House[] }, id: string): House | undefined {
  const needle = canonicalHouseId(id);
  if (!needle) return undefined;
  return db.houses.find((h) => sameHouseId(h.id, needle));
}
