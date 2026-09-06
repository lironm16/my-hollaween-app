import { promises as fs } from "node:fs";
import path from "node:path";
import { get as getBlob, put as putBlob } from "@vercel/blob";
import {
  clampTraffic,
  emptyTrafficFile,
  type HouseTraffic,
  type TrafficFile,
  type TrafficKind,
} from "@/lib/traffic";

const BLOB_PATH = "halloween-houses/traffic.json";
const MEM_TTL_MS = 800;

type GlobalBag = { __hwTraffic?: TrafficFile };

function getGlobal(): TrafficFile | null {
  const value = (globalThis as GlobalBag).__hwTraffic;
  return value ? structuredClone(value) : null;
}

function setGlobal(value: TrafficFile) {
  (globalThis as GlobalBag).__hwTraffic = structuredClone(value);
}

function blobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function filePath() {
  if (process.env.DATA_DIR) {
    await fs.mkdir(process.env.DATA_DIR, { recursive: true });
    return path.join(process.env.DATA_DIR, "traffic.json");
  }
  const localDir = path.join(process.cwd(), "data");
  try {
    await fs.mkdir(localDir, { recursive: true });
    return path.join(localDir, "traffic.json");
  } catch {
    const tmp = "/tmp/halloween-houses";
    await fs.mkdir(tmp, { recursive: true });
    return path.join(tmp, "traffic.json");
  }
}

async function readLocal(): Promise<TrafficFile | null> {
  try {
    const raw = await fs.readFile(await filePath(), "utf8");
    return JSON.parse(raw) as TrafficFile;
  } catch {
    return null;
  }
}

async function writeLocal(file: TrafficFile) {
  const dest = await filePath();
  const tmp = `${dest}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(file));
  await fs.rename(tmp, dest);
}

async function readBlob(): Promise<TrafficFile | null> {
  if (!blobEnabled()) return null;
  try {
    const result = await getBlob(BLOB_PATH, {
      access: "private",
      useCache: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result?.stream) return null;
    return JSON.parse(await new Response(result.stream).text()) as TrafficFile;
  } catch {
    return null;
  }
}

async function writeBlob(file: TrafficFile) {
  if (!blobEnabled()) return;
  try {
    await putBlob(BLOB_PATH, JSON.stringify(file), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      cacheControlMaxAge: 0,
    });
  } catch {
    /* keep memory/file */
  }
}

function stamp(value?: string) {
  const n = Date.parse(value ?? "");
  return Number.isFinite(n) ? n : 0;
}

function mergeTraffic(...candidates: Array<TrafficFile | null | undefined>): TrafficFile {
  const out: TrafficFile = emptyTrafficFile();
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (stamp(candidate.updatedAt) > stamp(out.updatedAt)) out.updatedAt = candidate.updatedAt;
    for (const [id, row] of Object.entries(candidate.houses ?? {})) {
      const current = out.houses[id] ?? { saved: 0, routed: 0, visited: 0 };
      out.houses[id] = {
        saved: Math.max(current.saved, row.saved ?? 0),
        routed: Math.max(current.routed, row.routed ?? 0),
        visited: Math.max(current.visited, row.visited ?? 0),
      };
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

let mem: TrafficFile | null = null;
let memAt = 0;

async function loadTrafficUnlocked(): Promise<TrafficFile> {
  if (mem && Date.now() - memAt < MEM_TTL_MS) return mem;
  const [local, blob, global] = await Promise.all([
    readLocal(),
    readBlob(),
    Promise.resolve(getGlobal()),
  ]);
  mem = mergeTraffic(local, blob, global);
  memAt = Date.now();
  setGlobal(mem);
  return mem;
}

async function loadTraffic(fresh = false): Promise<TrafficFile> {
  if (!fresh && mem && Date.now() - memAt < MEM_TTL_MS) return mem;
  return withLock(async () => {
    if (!fresh && mem && Date.now() - memAt < MEM_TTL_MS) return mem;
    return loadTrafficUnlocked();
  });
}

async function persistTraffic(file: TrafficFile) {
  mem = file;
  memAt = Date.now();
  setGlobal(file);
  try {
    await writeLocal(file);
  } catch {
    /* blob/memory still hold it */
  }
  await writeBlob(file);
}

export async function getHouseTraffic(): Promise<Record<string, HouseTraffic>> {
  const file = await loadTraffic();
  return file.houses;
}

export type TrafficDelta = { houseId: string; kind: TrafficKind; delta: number };

export async function applyTrafficDeltas(deltas: TrafficDelta[]): Promise<Record<string, HouseTraffic>> {
  return withLock(async () => {
    const file = await loadTrafficUnlocked();
    for (const item of deltas) {
      if (!item.houseId || item.houseId.length > 40) continue;
      if (item.kind !== "saved" && item.kind !== "routed" && item.kind !== "visited") continue;
      const delta = item.delta === -1 ? -1 : item.delta === 1 ? 1 : 0;
      if (!delta) continue;
      const current = file.houses[item.houseId] ?? { saved: 0, routed: 0, visited: 0 };
      current[item.kind] = Math.max(0, current[item.kind] + delta);
      file.houses[item.houseId] = clampTraffic(current);
    }
    file.updatedAt = new Date().toISOString();
    await persistTraffic(file);
    return file.houses;
  });
}
