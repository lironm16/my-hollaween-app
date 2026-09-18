import { promises as fs } from "node:fs";
import path from "node:path";
import { FieldValue } from "firebase-admin/firestore";
import { firestoreConfigured } from "@/lib/firestore-db";
import { metaDoc, resolveAdminFirestore } from "@/lib/firestore-admin";

export type ActivityTotals = {
  likedTotal: number;
  visitedTotal: number;
  updatedAt: string;
};

const MAX_DELTA = 80;

let mem: ActivityTotals | null = null;

/** Test-only — clears in-process cache between isolated DATA_DIR runs. */
export function resetActivityTotalsCacheForTests() {
  mem = null;
}

function emptyTotals(): ActivityTotals {
  return { likedTotal: 0, visitedTotal: 0, updatedAt: new Date(0).toISOString() };
}

function clampDelta(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n === 0) return 0;
  return Math.max(-MAX_DELTA, Math.min(MAX_DELTA, Math.trunc(n)));
}

async function activityFilePath() {
  if (process.env.DATA_DIR?.trim()) {
    await fs.mkdir(process.env.DATA_DIR, { recursive: true });
    return path.join(process.env.DATA_DIR, "activity-totals.json");
  }
  const localDir = path.join(process.cwd(), "data");
  await fs.mkdir(localDir, { recursive: true });
  return path.join(localDir, "activity-totals.json");
}

async function readLocalTotals(): Promise<ActivityTotals | null> {
  try {
    const raw = await fs.readFile(await activityFilePath(), "utf8");
    const parsed = JSON.parse(raw) as ActivityTotals;
    if (typeof parsed.likedTotal !== "number" || typeof parsed.visitedTotal !== "number") {
      return null;
    }
    return {
      likedTotal: Math.max(0, parsed.likedTotal),
      visitedTotal: Math.max(0, parsed.visitedTotal),
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

async function writeLocalTotals(totals: ActivityTotals) {
  const dest = await activityFilePath();
  const tmp = `${dest}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(totals));
  await fs.rename(tmp, dest);
}

export async function readActivityTotals(): Promise<ActivityTotals> {
  if (mem) return mem;

  if (firestoreConfigured()) {
    try {
      await resolveAdminFirestore();
      const snap = await metaDoc("activityTotals").get();
      if (!snap.exists) return emptyTotals();
      const data = snap.data() as Partial<ActivityTotals>;
      mem = {
        likedTotal: Math.max(0, Number(data.likedTotal ?? 0)),
        visitedTotal: Math.max(0, Number(data.visitedTotal ?? 0)),
        updatedAt: String(data.updatedAt ?? new Date(0).toISOString()),
      };
      return mem;
    } catch (error) {
      console.error("[activity] firestore read failed", error);
      return emptyTotals();
    }
  }

  mem = (await readLocalTotals()) ?? emptyTotals();
  return mem;
}

export async function applyActivityDelta(input: {
  likedDelta?: unknown;
  visitedDelta?: unknown;
}): Promise<ActivityTotals> {
  const likedDelta = clampDelta(input.likedDelta);
  const visitedDelta = clampDelta(input.visitedDelta);
  if (likedDelta === 0 && visitedDelta === 0) return readActivityTotals();

  const updatedAt = new Date().toISOString();

  if (firestoreConfigured()) {
    try {
      await resolveAdminFirestore();
      await metaDoc("activityTotals").set(
        {
          likedTotal: FieldValue.increment(likedDelta),
          visitedTotal: FieldValue.increment(visitedDelta),
          updatedAt,
        },
        { merge: true },
      );
      mem = null;
      return readActivityTotals();
    } catch (error) {
      console.error("[activity] firestore increment failed", error);
      throw error;
    }
  }

  const current = await readActivityTotals();
  mem = {
    likedTotal: Math.max(0, current.likedTotal + likedDelta),
    visitedTotal: Math.max(0, current.visitedTotal + visitedDelta),
    updatedAt,
  };
  await writeLocalTotals(mem);
  return mem;
}
