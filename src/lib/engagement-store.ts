import { promises as fs } from "node:fs";
import path from "node:path";
import {
  firestoreConfigured,
  housesCollection,
  neighborhoodRoot,
  resolveAdminFirestore,
} from "@/lib/firestore-admin";
import { canonicalHouseId } from "@/lib/ids";
import {
  aggregateEngagementEvents,
  clampEngagementDelta,
  normalizeEngagementCounts,
  applyEngagementDelta,
  type EngagementEvent,
  type HouseEngagementCounts,
} from "@/lib/house-engagement";
import type { House } from "@/lib/types";
import { loadDb, runSyncedWrite } from "@/lib/store/core";

const SESSIONS_FILE = "activity-sessions.json";
const MAX_PENDING_PER_SESSION = 120;
const MAX_EVENTS_PER_POST = 40;

export type ActivitySessionDoc = {
  updatedAt: string;
  pending: EngagementEvent[];
};

function sessionsFilePath() {
  if (process.env.DATA_DIR?.trim()) {
    return path.join(process.env.DATA_DIR.trim(), SESSIONS_FILE);
  }
  return path.join(process.cwd(), "data", SESSIONS_FILE);
}

function activitySessionsCollection() {
  return neighborhoodRoot().collection("activitySessions");
}

function normalizeEvents(events: EngagementEvent[]): EngagementEvent[] {
  const out: EngagementEvent[] = [];
  for (const raw of events.slice(0, MAX_EVENTS_PER_POST)) {
    const houseId = canonicalHouseId(raw.houseId);
    if (!houseId) continue;
    const kind = raw.kind === "visit" ? "visit" : raw.kind === "like" ? "like" : null;
    if (!kind) continue;
    const delta = clampEngagementDelta(raw.delta);
    if (!delta) continue;
    out.push({ houseId, kind, delta });
  }
  return out;
}

function trimPending(pending: EngagementEvent[]) {
  if (pending.length <= MAX_PENDING_PER_SESSION) return pending;
  return pending.slice(pending.length - MAX_PENDING_PER_SESSION);
}

async function readFileSessions(): Promise<Record<string, ActivitySessionDoc>> {
  try {
    const raw = await fs.readFile(sessionsFilePath(), "utf8");
    const parsed = JSON.parse(raw) as Record<string, ActivitySessionDoc>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeFileSessions(sessions: Record<string, ActivitySessionDoc>) {
  const dest = sessionsFilePath();
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(sessions));
  await fs.rename(tmp, dest);
}

export async function appendActivitySessionEvents(deviceId: string, events: EngagementEvent[]) {
  const normalized = normalizeEvents(events);
  if (!normalized.length) return;
  const now = new Date().toISOString();

  if (firestoreConfigured()) {
    await resolveAdminFirestore();
    const ref = activitySessionsCollection().doc(deviceId);
    await ref.set(
      {
        updatedAt: now,
        pending: trimPending(
          [...(((await ref.get()).data() as ActivitySessionDoc | undefined)?.pending ?? []), ...normalized],
        ),
      },
      { merge: true },
    );
    return;
  }

  const sessions = await readFileSessions();
  const prev = sessions[deviceId] ?? { updatedAt: now, pending: [] };
  sessions[deviceId] = {
    updatedAt: now,
    pending: trimPending([...prev.pending, ...normalized]),
  };
  await writeFileSessions(sessions);
}

async function collectPendingEvents(): Promise<{
  events: EngagementEvent[];
  sessionKeys: string[];
}> {
  const events: EngagementEvent[] = [];
  const sessionKeys: string[] = [];

  if (firestoreConfigured()) {
    await resolveAdminFirestore();
    const snap = await activitySessionsCollection().limit(500).get();
    for (const doc of snap.docs) {
      const row = doc.data() as ActivitySessionDoc;
      if (Array.isArray(row.pending) && row.pending.length) {
        events.push(...row.pending);
        sessionKeys.push(doc.id);
      }
    }
    return { events, sessionKeys };
  }

  const sessions = await readFileSessions();
  for (const [deviceId, row] of Object.entries(sessions)) {
    if (!row.pending?.length) continue;
    events.push(...row.pending);
    sessionKeys.push(deviceId);
  }
  return { events, sessionKeys };
}

async function clearSessionPending(sessionKeys: string[]) {
  if (!sessionKeys.length) return;
  const now = new Date().toISOString();
  if (firestoreConfigured()) {
    await resolveAdminFirestore();
    const batch = (await resolveAdminFirestore()).batch();
    for (const id of sessionKeys) {
      batch.set(activitySessionsCollection().doc(id), { updatedAt: now, pending: [] }, { merge: true });
    }
    await batch.commit();
    return;
  }
  const sessions = await readFileSessions();
  for (const id of sessionKeys) {
    if (sessions[id]) sessions[id] = { updatedAt: now, pending: [] };
  }
  await writeFileSessions(sessions);
}

async function applyRollupToHouses(deltas: Map<string, { like: number; visit: number }>) {
  if (!deltas.size) return;
  const now = new Date().toISOString();

  if (firestoreConfigured()) {
    await resolveAdminFirestore();
    const db = await resolveAdminFirestore();
    for (const [houseId, delta] of deltas) {
      if (!delta.like && !delta.visit) continue;
      const ref = housesCollection().doc(houseId);
      const snap = await ref.get();
      const existing = normalizeEngagementCounts(
        snap.exists ? (snap.data() as HouseEngagementCounts) : undefined,
      );
      const next = applyEngagementDelta(existing, delta);
      await ref.set(
        {
          likeCount: next.likeCount,
          visitCount: next.visitCount,
          engagementAt: now,
        },
        { merge: true },
      );
    }
    return;
  }

  await runSyncedWrite((db) => {
    for (const [houseId, delta] of deltas) {
      if (!delta.like && !delta.visit) continue;
      const idx = db.houses.findIndex((h) => canonicalHouseId(h.id) === houseId);
      if (idx < 0) continue;
      const house = db.houses[idx];
      const next = applyEngagementDelta(normalizeEngagementCounts(house), delta);
      house.likeCount = next.likeCount;
      house.visitCount = next.visitCount;
      house.engagementAt = now;
    }
  });
}

export async function rollupActivitySessions(): Promise<{ housesUpdated: number; eventsProcessed: number }> {
  const { events, sessionKeys } = await collectPendingEvents();
  if (!events.length) return { housesUpdated: 0, eventsProcessed: 0 };
  const deltas = aggregateEngagementEvents(events);
  await applyRollupToHouses(deltas);
  await clearSessionPending(sessionKeys);
  return { housesUpdated: deltas.size, eventsProcessed: events.length };
}

export async function readHouseEngagementCounts(
  ids: string[],
): Promise<Record<string, HouseEngagementCounts>> {
  const unique = [...new Set(ids.map((id) => canonicalHouseId(id)).filter(Boolean))].slice(0, 80);
  const out: Record<string, HouseEngagementCounts> = {};
  if (!unique.length) return out;

  if (firestoreConfigured()) {
    await resolveAdminFirestore();
    const refs = unique.map((id) => housesCollection().doc(id));
    const snaps = await (await resolveAdminFirestore()).getAll(...refs);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      out[snap.id] = normalizeEngagementCounts(snap.data() as HouseEngagementCounts);
    }
    return out;
  }

  const db = await loadDb();
  for (const id of unique) {
    const house = db.houses.find((h) => canonicalHouseId(h.id) === id);
    if (house) out[id] = normalizeEngagementCounts(house);
  }
  return out;
}
