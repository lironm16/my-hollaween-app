import {
  anomalyDetectionContextFromDb,
  clusterMembersForAnomalyReview,
  listAllActionableAnomalies,
  reconcileHouseAnomalyReviews,
  type AnomalyListItem,
} from "@/lib/house-anomalies";
import type { HouseSet } from "@/lib/house-set";
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

export async function listAdminHouseAnomalies(houseSet: HouseSet = "real"): Promise<AdminAnomaliesResponse> {
  const db = await loadDb();
  const ctx = anomalyDetectionContextFromDb(db);
  const active = db.houses.filter((h) => !isHouseDeleted(h) && !h.isPractice);
  return {
    items: listAllActionableAnomalies(active, ctx, { houseSet }),
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

  const dbBefore = await loadDb();
  const active = dbBefore.houses.filter((h) => !isHouseDeleted(h) && !h.isPractice);
  const targetIds = clusterMembersForAnomalyReview(active, docId, input.kind);

  const updated = await runSyncedWrite((db) => {
    const touched: House[] = [];
    for (const id of targetIds) {
      const house = findHouseInDb(db, id);
      if (!house || isHouseDeleted(house)) continue;
      const reviews = { ...(house.adminAnomalyReviews ?? {}) };
      reviews[input.kind] = {
        status: input.status,
        reviewedAt: new Date().toISOString(),
        houseUpdatedAt: house.updatedAt,
        ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      };
      house.adminAnomalyReviews = reviews;
      touched.push(house);
    }
    return touched.length ? touched : null;
  });

  if (!updated) return { error: "missing" };

  if (firestoreConfigured()) {
    for (const house of updated) {
      await writeFirestoreHouse(house);
    }
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
