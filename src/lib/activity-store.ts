import { promises as fs } from "node:fs";
import path from "node:path";
import { get as getBlob, put as putBlob } from "@vercel/blob";
import {
  getFirestoreActivityTotals,
  reportFirestoreDeviceActivity,
} from "@/lib/activity-firestore";
import {
  blobForEphemeralCounters,
  privateBlobGetOptions,
  privateBlobPutOptions,
} from "@/lib/blob-auth";
import { firestoreConfigured } from "@/lib/firestore-admin";

const BLOB_PATH = "halloween-houses/activity.json";
const MAX_DEVICES = 5000;
const MEM_TTL_MS = 20_000;
/** Max one blob write per interval when counts change (off Vercel only). */
const BLOB_PERSIST_MS = 5 * 60_000;

export type DeviceActivity = {
  liked: number;
  visited: number;
  at: number;
};

export type ActivityFile = {
  updatedAt: string;
  devices: Record<string, DeviceActivity>;
};

export type ActivityTotals = {
  totalLiked: number;
  totalVisited: number;
  devicesReporting: number;
};

type GlobalBag = {
  __hwActivity?: ActivityFile;
  __hwActivityLastBlob?: number;
};

function emptyFile(): ActivityFile {
  return { updatedAt: new Date(0).toISOString(), devices: {} };
}

function getGlobal(): ActivityFile | null {
  const value = (globalThis as GlobalBag).__hwActivity;
  return value ? structuredClone(value) : null;
}

function setGlobal(value: ActivityFile) {
  (globalThis as GlobalBag).__hwActivity = structuredClone(value);
}

function lastBlobAt() {
  return (globalThis as GlobalBag).__hwActivityLastBlob ?? 0;
}

function setLastBlobAt(at: number) {
  (globalThis as GlobalBag).__hwActivityLastBlob = at;
}

async function filePath() {
  if (process.env.DATA_DIR) {
    await fs.mkdir(process.env.DATA_DIR, { recursive: true });
    return path.join(process.env.DATA_DIR, "activity.json");
  }
  const localDir = path.join(process.cwd(), "data");
  try {
    await fs.mkdir(localDir, { recursive: true });
    return path.join(localDir, "activity.json");
  } catch {
    const tmp = "/tmp/halloween-houses";
    await fs.mkdir(tmp, { recursive: true });
    return path.join(tmp, "activity.json");
  }
}

async function readLocal(): Promise<ActivityFile | null> {
  try {
    const raw = await fs.readFile(await filePath(), "utf8");
    return JSON.parse(raw) as ActivityFile;
  } catch {
    return null;
  }
}

async function writeLocal(file: ActivityFile) {
  const dest = await filePath();
  const tmp = `${dest}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(file));
  await fs.rename(tmp, dest);
}

async function readBlob(): Promise<ActivityFile | null> {
  if (!blobForEphemeralCounters()) return null;
  try {
    const result = await getBlob(BLOB_PATH, privateBlobGetOptions());
    if (!result?.stream) return null;
    return JSON.parse(await new Response(result.stream).text()) as ActivityFile;
  } catch {
    return null;
  }
}

async function writeBlob(file: ActivityFile) {
  if (!blobForEphemeralCounters()) return;
  try {
    await putBlob(BLOB_PATH, JSON.stringify(file), privateBlobPutOptions("application/json"));
  } catch {
    /* keep memory/file */
  }
}

function mergeFiles(...candidates: Array<ActivityFile | null | undefined>): ActivityFile {
  const out = emptyFile();
  for (const candidate of candidates) {
    if (!candidate) continue;
    const stamp = Date.parse(candidate.updatedAt);
    if (Number.isFinite(stamp) && stamp > Date.parse(out.updatedAt)) out.updatedAt = candidate.updatedAt;
    for (const [id, entry] of Object.entries(candidate.devices ?? {})) {
      const prev = out.devices[id];
      if (!prev || entry.at >= prev.at) out.devices[id] = entry;
    }
  }
  return out;
}

let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

let mem: ActivityFile | null = null;
let memAt = 0;

function remember(file: ActivityFile) {
  mem = file;
  memAt = Date.now();
  setGlobal(file);
}

async function loadUnlocked(): Promise<ActivityFile> {
  if (mem && Date.now() - memAt < MEM_TTL_MS) return mem;
  const [local, blob, global] = await Promise.all([
    readLocal(),
    readBlob(),
    Promise.resolve(getGlobal()),
  ]);
  mem = mergeFiles(mem, local, blob, global);
  memAt = Date.now();
  setGlobal(mem);
  return mem;
}

async function persist(file: ActivityFile) {
  remember(file);
  try {
    await writeLocal(file);
  } catch {
    /* blob/memory still hold it */
  }
  await writeBlob(file);
  setLastBlobAt(Date.now());
}

function prune(file: ActivityFile) {
  const entries = Object.entries(file.devices);
  if (entries.length <= MAX_DEVICES) return;
  entries.sort((a, b) => b[1].at - a[1].at);
  file.devices = Object.fromEntries(entries.slice(0, MAX_DEVICES));
}

export function aggregateActivityTotals(file: ActivityFile): ActivityTotals {
  let totalLiked = 0;
  let totalVisited = 0;
  for (const entry of Object.values(file.devices)) {
    totalLiked += Math.max(0, entry.liked);
    totalVisited += Math.max(0, entry.visited);
  }
  return {
    totalLiked,
    totalVisited,
    devicesReporting: Object.keys(file.devices).length,
  };
}

function cleanDeviceId(id: string) {
  return id.trim().slice(0, 40);
}

function cleanCount(value: unknown) {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 500);
}

/** Firestore on Vercel; local file/memory off Vercel. */
export function activityBackendEnabled() {
  return firestoreConfigured() || process.env.VERCEL !== "1";
}

export async function reportDeviceActivity(
  deviceId: string,
  likedCount: number,
  visitedCount: number,
): Promise<ActivityTotals> {
  const clean = cleanDeviceId(deviceId);
  if (!clean || clean.length < 8) return getActivityTotals();
  const liked = cleanCount(likedCount);
  const visited = cleanCount(visitedCount);
  if (firestoreConfigured()) {
    return reportFirestoreDeviceActivity(clean, liked, visited);
  }
  return withLock(async () => {
    const file = mem ?? (await loadUnlocked());
    const now = Date.now();
    const prev = file.devices[clean];
    if (prev && prev.liked === liked && prev.visited === visited) {
      return aggregateActivityTotals(file);
    }
    file.devices[clean] = { liked, visited, at: now };
    prune(file);
    file.updatedAt = new Date().toISOString();
    remember(file);
    if (blobForEphemeralCounters() && now - lastBlobAt() >= BLOB_PERSIST_MS) {
      await persist(file);
    }
    return aggregateActivityTotals(file);
  });
}

export async function getActivityTotals(): Promise<ActivityTotals> {
  if (firestoreConfigured()) {
    return getFirestoreActivityTotals();
  }
  return withLock(async () => {
    const file = await loadUnlocked();
    return aggregateActivityTotals(file);
  });
}
