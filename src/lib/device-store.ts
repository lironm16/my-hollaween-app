import { promises as fs } from "node:fs";
import path from "node:path";
import { get as getBlob, put as putBlob } from "@vercel/blob";
import { blobConfigured, privateBlobGetOptions, privateBlobPutOptions } from "@/lib/blob-auth";

const BLOB_PATH = "halloween-houses/devices.json";
const MAX_DEVICES = 5000;
const MEM_TTL_MS = 20_000;
const BLOB_PERSIST_MS = 20_000;

type DeviceFile = {
  updatedAt: string;
  ids: Record<string, number>;
};

type GlobalBag = {
  __hwDevices?: DeviceFile;
  __hwDevicesLastBlob?: number;
};

function emptyFile(): DeviceFile {
  return { updatedAt: new Date(0).toISOString(), ids: {} };
}

function getGlobal(): DeviceFile | null {
  const value = (globalThis as GlobalBag).__hwDevices;
  return value ? structuredClone(value) : null;
}

function setGlobal(value: DeviceFile) {
  (globalThis as GlobalBag).__hwDevices = structuredClone(value);
}

function lastBlobAt() {
  return (globalThis as GlobalBag).__hwDevicesLastBlob ?? 0;
}

function setLastBlobAt(at: number) {
  (globalThis as GlobalBag).__hwDevicesLastBlob = at;
}

async function filePath() {
  if (process.env.DATA_DIR) {
    await fs.mkdir(process.env.DATA_DIR, { recursive: true });
    return path.join(process.env.DATA_DIR, "devices.json");
  }
  const localDir = path.join(process.cwd(), "data");
  try {
    await fs.mkdir(localDir, { recursive: true });
    return path.join(localDir, "devices.json");
  } catch {
    const tmp = "/tmp/halloween-houses";
    await fs.mkdir(tmp, { recursive: true });
    return path.join(tmp, "devices.json");
  }
}

async function readLocal(): Promise<DeviceFile | null> {
  try {
    const raw = await fs.readFile(await filePath(), "utf8");
    return JSON.parse(raw) as DeviceFile;
  } catch {
    return null;
  }
}

async function writeLocal(file: DeviceFile) {
  const dest = await filePath();
  const tmp = `${dest}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(file));
  await fs.rename(tmp, dest);
}

async function readBlob(): Promise<DeviceFile | null> {
  if (!blobConfigured()) return null;
  try {
    const result = await getBlob(BLOB_PATH, privateBlobGetOptions());
    if (!result?.stream) return null;
    return JSON.parse(await new Response(result.stream).text()) as DeviceFile;
  } catch {
    return null;
  }
}

async function writeBlob(file: DeviceFile) {
  if (!blobConfigured()) return;
  try {
    await putBlob(BLOB_PATH, JSON.stringify(file), privateBlobPutOptions("application/json"));
  } catch {
    /* keep memory/file */
  }
}

function mergeFiles(...candidates: Array<DeviceFile | null | undefined>): DeviceFile {
  const out = emptyFile();
  for (const candidate of candidates) {
    if (!candidate) continue;
    const stamp = Date.parse(candidate.updatedAt);
    if (Number.isFinite(stamp) && stamp > Date.parse(out.updatedAt)) out.updatedAt = candidate.updatedAt;
    for (const [id, seen] of Object.entries(candidate.ids ?? {})) {
      out.ids[id] = Math.max(out.ids[id] ?? 0, seen ?? 0);
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

let mem: DeviceFile | null = null;
let memAt = 0;

function remember(file: DeviceFile) {
  mem = file;
  memAt = Date.now();
  setGlobal(file);
}

async function loadUnlocked(): Promise<DeviceFile> {
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

async function persist(file: DeviceFile) {
  remember(file);
  try {
    await writeLocal(file);
  } catch {
    /* blob/memory still hold it */
  }
  await writeBlob(file);
  setLastBlobAt(Date.now());
}

function prune(file: DeviceFile) {
  const ids = Object.entries(file.ids);
  if (ids.length <= MAX_DEVICES) return;
  ids.sort((a, b) => b[1] - a[1]);
  file.ids = Object.fromEntries(ids.slice(0, MAX_DEVICES));
}

export async function rememberDevice(id: string): Promise<number> {
  const clean = id.trim().slice(0, 40);
  if (!clean || clean.length < 8) return countSeenDevices();
  return withLock(async () => {
    const file = mem ?? (await loadUnlocked());
    const now = Date.now();
    file.ids[clean] = now;
    prune(file);
    file.updatedAt = new Date().toISOString();
    remember(file);
    if (now - lastBlobAt() >= BLOB_PERSIST_MS) {
      await persist(file);
    }
    return Object.keys(file.ids).length;
  });
}

export async function countSeenDevices(): Promise<number> {
  return withLock(async () => {
    const file = await loadUnlocked();
    return Object.keys(file.ids).length;
  });
}
