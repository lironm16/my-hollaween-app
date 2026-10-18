import { promises as fs } from "node:fs";
import path from "node:path";
import {
  firestoreConfigured,
  metaDoc,
  nightPassesCollection,
  resolveAdminFirestore,
} from "@/lib/firestore-admin";

export type NightPassEvent = {
  type: "registered" | "reregistered" | "reset" | "evicted" | "removed";
  at: string;
  name?: string;
  phone?: string;
  sessionId?: string;
};

export type HouseAccessSession = {
  sessionId: string;
  tokenHash: string;
  registeredAt: string;
  holderName: string;
  holderPhone: string;
  /** Set on register — iOS browser vs home-screen app. */
  clientSurface?: "ios-browser" | "ios-app" | "other";
};

/** Device registry for one house — family code is always house.editCode. */
export type NightPassRecord = {
  id: string;
  houseId: string;
  sessions: HouseAccessSession[];
  resetCount: number;
  history: NightPassEvent[];
  createdAt: string;
  updatedAt: string;
};

export type NightPassSettings = {
  enabled: boolean;
  updatedAt?: string;
};

const SETTINGS_TTL_MS = 15_000;
const PASS_TTL_MS = 20_000;

let settingsMem: { value: NightPassSettings; at: number } | null = null;
const passMem = new Map<string, { value: NightPassRecord | null; at: number }>();

type LocalFile = {
  settings: NightPassSettings;
  passes: Record<string, NightPassRecord>;
};

async function localFilePath() {
  const dir = process.env.DATA_DIR?.trim() || path.join(process.cwd(), "data");
  try {
    await fs.mkdir(dir, { recursive: true });
    return path.join(dir, "night-passes.json");
  } catch {
    const tmp = "/tmp/halloween-houses";
    await fs.mkdir(tmp, { recursive: true });
    return path.join(tmp, "night-passes.json");
  }
}

async function readLocal(): Promise<LocalFile> {
  try {
    const raw = await fs.readFile(await localFilePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<LocalFile>;
    return {
      settings: { enabled: Boolean(parsed.settings?.enabled), updatedAt: parsed.settings?.updatedAt },
      passes: parsed.passes && typeof parsed.passes === "object" ? parsed.passes : {},
    };
  } catch {
    return { settings: { enabled: false }, passes: {} };
  }
}

async function writeLocal(file: LocalFile) {
  const target = await localFilePath();
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(file, null, 2));
  await fs.rename(tmp, target);
}

let localChain: Promise<unknown> = Promise.resolve();
function withLocalLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = localChain.then(fn, fn);
  localChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function invalidateNightPassMem() {
  settingsMem = null;
  passMem.clear();
}

export async function readNightPassSettings(): Promise<NightPassSettings> {
  if (settingsMem && Date.now() - settingsMem.at < SETTINGS_TTL_MS) return settingsMem.value;
  let value: NightPassSettings = { enabled: false };
  if (firestoreConfigured()) {
    try {
      await resolveAdminFirestore();
      const snap = await metaDoc("nightPasses").get();
      const row = snap.exists ? (snap.data() as Partial<NightPassSettings>) : null;
      value = { enabled: Boolean(row?.enabled), updatedAt: row?.updatedAt };
    } catch (error) {
      console.error("[night-passes] settings read failed", error);
    }
  } else {
    value = (await readLocal()).settings;
  }
  settingsMem = { value, at: Date.now() };
  return value;
}

export async function writeNightPassSettings(next: NightPassSettings) {
  const value = { ...next, updatedAt: new Date().toISOString() };
  if (firestoreConfigured()) {
    await resolveAdminFirestore();
    await metaDoc("nightPasses").set(value);
  } else {
    await withLocalLock(async () => {
      const file = await readLocal();
      file.settings = value;
      await writeLocal(file);
    });
  }
  settingsMem = { value, at: Date.now() };
  return value;
}

export async function readNightPass(id: string, options?: { fresh?: boolean }) {
  const cached = passMem.get(id);
  if (!options?.fresh && cached && Date.now() - cached.at < PASS_TTL_MS) return cached.value;
  let value: NightPassRecord | null = null;
  if (firestoreConfigured()) {
    await resolveAdminFirestore();
    const snap = await nightPassesCollection().doc(id).get();
    value = snap.exists ? (snap.data() as NightPassRecord) : null;
  } else {
    value = (await readLocal()).passes[id] ?? null;
  }
  passMem.set(id, { value, at: Date.now() });
  return value;
}

export async function listHouseNightPasses(houseId: string): Promise<NightPassRecord[]> {
  let rows: NightPassRecord[];
  if (firestoreConfigured()) {
    await resolveAdminFirestore();
    const snap = await nightPassesCollection().where("houseId", "==", houseId).get();
    rows = snap.docs.map((doc) => doc.data() as NightPassRecord);
  } else {
    rows = Object.values((await readLocal()).passes).filter((row) => row.houseId === houseId);
  }
  for (const row of rows) passMem.set(row.id, { value: row, at: Date.now() });
  return rows;
}

/** Read-modify-write one pass atomically. `mutate` returns the next record, or null to leave it. */
export async function updateNightPass(
  id: string,
  mutate: (current: NightPassRecord | null) => NightPassRecord | null,
): Promise<NightPassRecord | null> {
  let result: NightPassRecord | null = null;
  if (firestoreConfigured()) {
    const db = await resolveAdminFirestore();
    const ref = nightPassesCollection().doc(id);
    result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists ? (snap.data() as NightPassRecord) : null;
      const next = mutate(current);
      if (next) tx.set(ref, next);
      return next ?? current;
    });
  } else {
    result = await withLocalLock(async () => {
      const file = await readLocal();
      const current = file.passes[id] ?? null;
      const next = mutate(current);
      if (next) {
        file.passes[id] = next;
        await writeLocal(file);
      }
      return next ?? current;
    });
  }
  passMem.set(id, { value: result, at: Date.now() });
  return result;
}

export async function deleteNightPass(id: string) {
  if (firestoreConfigured()) {
    await resolveAdminFirestore();
    await nightPassesCollection().doc(id).delete();
  } else {
    await withLocalLock(async () => {
      const file = await readLocal();
      delete file.passes[id];
      await writeLocal(file);
    });
  }
  passMem.delete(id);
}
