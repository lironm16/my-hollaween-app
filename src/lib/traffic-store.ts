import { promises as fs } from "node:fs";
import path from "node:path";
import { get as getBlob, put as putBlob } from "@vercel/blob";
import {
  clampTraffic,
  clampTrafficDelta,
  emptyTrafficFile,
  type HouseTraffic,
  type TrafficDelta,
  type TrafficFile,
} from "@/lib/traffic";

export type { TrafficDelta };

const BLOB_PATH = "halloween-houses/traffic.json";
const SEED_TRAFFIC_PATH = path.join(process.cwd(), "data", "seed-traffic.json");
const MEM_GET_TTL_MS = 20_000;
/** Shared blob is the expensive write — persist hearts immediately so a refresh keeps the count. */
const BLOB_PERSIST_MS = 0;

type GlobalBag = {
  __hwTraffic?: TrafficFile;
  __hwTrafficLastBlob?: number;
};

function getGlobal(): TrafficFile | null {
  const value = (globalThis as GlobalBag).__hwTraffic;
  return value ? structuredClone(value) : null;
}

function setGlobal(value: TrafficFile) {
  (globalThis as GlobalBag).__hwTraffic = structuredClone(value);
}

function lastBlobAt() {
  return (globalThis as GlobalBag).__hwTrafficLastBlob ?? 0;
}

function setLastBlobAt(at: number) {
  (globalThis as GlobalBag).__hwTrafficLastBlob = at;
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
let seedTraffic: TrafficFile | null | undefined;

function demoTrafficEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.DEMO_TRAFFIC === "1";
}

async function loadSeedTraffic(): Promise<TrafficFile | null> {
  if (!demoTrafficEnabled()) return null;
  if (seedTraffic !== undefined) return seedTraffic;
  try {
    const raw = await fs.readFile(SEED_TRAFFIC_PATH, "utf8");
    seedTraffic = JSON.parse(raw) as TrafficFile;
  } catch {
    seedTraffic = null;
  }
  return seedTraffic;
}

function withSeedTraffic(file: TrafficFile, seed: TrafficFile | null): TrafficFile {
  if (!seed) return file;
  const out: TrafficFile = {
    updatedAt: stamp(file.updatedAt) >= stamp(seed.updatedAt) ? file.updatedAt : seed.updatedAt,
    houses: { ...file.houses },
  };
  for (const [id, row] of Object.entries(seed.houses ?? {})) {
    const live = out.houses[id] ?? { saved: 0, routed: 0, visited: 0 };
    out.houses[id] = {
      saved: live.saved + (row.saved ?? 0),
      routed: live.routed + (row.routed ?? 0),
      visited: live.visited + (row.visited ?? 0),
    };
  }
  return out;
}

function remember(file: TrafficFile) {
  mem = file;
  memAt = Date.now();
  setGlobal(file);
}

async function loadTrafficUnlocked(): Promise<TrafficFile> {
  const seed = await loadSeedTraffic();
  if (mem && Date.now() - memAt < MEM_GET_TTL_MS) return withSeedTraffic(mem, seed);
  const [local, blob, global] = await Promise.all([
    readLocal(),
    readBlob(),
    Promise.resolve(getGlobal()),
  ]);
  mem = mergeTraffic(mem, local, blob, global);
  memAt = Date.now();
  setGlobal(mem);
  return withSeedTraffic(mem, seed);
}

async function persistShared(file: TrafficFile) {
  remember(file);
  try {
    await writeLocal(file);
  } catch {
    /* blob/memory still hold it */
  }
  await writeBlob(file);
  setLastBlobAt(Date.now());
}

export async function getHouseTraffic(): Promise<Record<string, HouseTraffic>> {
  return withLock(async () => {
    const file = await loadTrafficUnlocked();
    return file.houses;
  });
}

export async function applyTrafficDeltas(deltas: TrafficDelta[]): Promise<Record<string, HouseTraffic>> {
  return withLock(async () => {
    // Memory is the live counter. Do not re-read blob here — that would drop
    // increments that have not been persisted yet.
    const file = mem ?? (await loadTrafficUnlocked());
    for (const item of deltas) {
      if (!item.houseId || item.houseId.length > 40) continue;
      if (item.kind !== "saved" && item.kind !== "routed" && item.kind !== "visited") continue;
      const delta = clampTrafficDelta(item.delta);
      if (!delta) continue;
      const current = file.houses[item.houseId] ?? { saved: 0, routed: 0, visited: 0 };
      current[item.kind] = Math.max(0, current[item.kind] + delta);
      file.houses[item.houseId] = clampTraffic(current);
    }
    file.updatedAt = new Date().toISOString();
    remember(file);
    if (Date.now() - lastBlobAt() >= BLOB_PERSIST_MS) {
      await persistShared(file);
    }
    const seed = await loadSeedTraffic();
    return withSeedTraffic(file, seed).houses;
  });
}
