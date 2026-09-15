import {
  firestoreConfigured,
  neighborhoodRoot,
  resolveAdminFirestore,
} from "@/lib/firestore-admin";
import type { ActivityTotals, DeviceActivity } from "@/lib/activity-store";

const MAX_DEVICES = 5000;
const DOC_ID = "activityTotals";

export type ActivityDoc = {
  totalLiked: number;
  totalVisited: number;
  devices: Record<string, DeviceActivity>;
  updatedAt: string;
};

function activityDocRef() {
  return neighborhoodRoot().collection("meta").doc(DOC_ID);
}

export function emptyActivityDoc(): ActivityDoc {
  return { totalLiked: 0, totalVisited: 0, devices: {}, updatedAt: new Date(0).toISOString() };
}

export function activityTotalsFromDoc(doc: ActivityDoc): ActivityTotals {
  return {
    totalLiked: Math.max(0, doc.totalLiked),
    totalVisited: Math.max(0, doc.totalVisited),
    devicesReporting: Object.keys(doc.devices).length,
  };
}

/** Apply one device sync; returns whether counts changed. */
export function applyDeviceActivityUpdate(
  doc: ActivityDoc,
  deviceId: string,
  liked: number,
  visited: number,
  at = Date.now(),
): boolean {
  const prev = doc.devices[deviceId];
  if (prev && prev.liked === liked && prev.visited === visited) return false;
  const oldLiked = prev ? Math.max(0, prev.liked) : 0;
  const oldVisited = prev ? Math.max(0, prev.visited) : 0;
  doc.totalLiked = Math.max(0, doc.totalLiked + liked - oldLiked);
  doc.totalVisited = Math.max(0, doc.totalVisited + visited - oldVisited);
  doc.devices[deviceId] = { liked, visited, at };
  pruneActivityDevices(doc);
  doc.updatedAt = new Date(at).toISOString();
  return true;
}

export function pruneActivityDevices(doc: ActivityDoc) {
  const entries = Object.entries(doc.devices);
  if (entries.length <= MAX_DEVICES) return;
  entries.sort((a, b) => b[1].at - a[1].at);
  const kept = entries.slice(0, MAX_DEVICES);
  for (const [, entry] of entries.slice(MAX_DEVICES)) {
    doc.totalLiked -= Math.max(0, entry.liked);
    doc.totalVisited -= Math.max(0, entry.visited);
  }
  doc.devices = Object.fromEntries(kept);
  doc.totalLiked = Math.max(0, doc.totalLiked);
  doc.totalVisited = Math.max(0, doc.totalVisited);
}

export async function getFirestoreActivityTotals(): Promise<ActivityTotals> {
  if (!firestoreConfigured()) {
    return { totalLiked: 0, totalVisited: 0, devicesReporting: 0 };
  }
  try {
    await resolveAdminFirestore();
    const snap = await activityDocRef().get();
    if (!snap.exists) return { totalLiked: 0, totalVisited: 0, devicesReporting: 0 };
    return activityTotalsFromDoc(snap.data() as ActivityDoc);
  } catch (error) {
    console.error("[firestore] activity read failed", error);
    return { totalLiked: 0, totalVisited: 0, devicesReporting: 0 };
  }
}

export async function reportFirestoreDeviceActivity(
  deviceId: string,
  likedCount: number,
  visitedCount: number,
): Promise<ActivityTotals> {
  if (!firestoreConfigured()) {
    return { totalLiked: 0, totalVisited: 0, devicesReporting: 0 };
  }
  const db = await resolveAdminFirestore();
  const ref = activityDocRef();
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const doc = snap.exists ? { ...(snap.data() as ActivityDoc) } : emptyActivityDoc();
    if (!applyDeviceActivityUpdate(doc, deviceId, likedCount, visitedCount)) {
      return activityTotalsFromDoc(doc);
    }
    tx.set(ref, doc);
    return activityTotalsFromDoc(doc);
  });
}
