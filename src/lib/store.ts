import { promises as fs } from "node:fs";
import path from "node:path";
import { newEditCode, newPublicId, toPublicHouse } from "@/lib/ids";
import { inNeighborhood } from "@/lib/config";
import { config } from "@/lib/config";
import { assertRealAddress } from "@/lib/geocode";
import { defaultTreatStock, effectiveVisit, isPubliclyListed } from "@/lib/house-state";
import { cloneDb } from "@/lib/catalog-sync";
import { parsePhotoUrl } from "@/lib/photos";
import {
  fetchRemoteDb,
  fetchRemoteSnapshot,
  persistRemote,
  remoteDbUrl,
  rememberRemoteError,
  rememberRemoteOk,
  remoteHealthy,
} from "@/lib/remote-db";
import {
  HOUSE_THEMES,
  type Catalog,
  type DbFile,
  type House,
  type HouseInput,
  type HouseStatus,
  type HouseTheme,
  type NightPatch,
  type PublicHouse,
  type TreatStock,
  type VisitState,
} from "@/lib/types";

const SEED_PATH = path.join(process.cwd(), "data", "seed.json");
const MEM_TTL_MS = 1500;
const REMOTE_PULL_MS = 2 * 60 * 1000;

let chain: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function canWrite(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
    const probe = path.join(dir, ".write-probe");
    await fs.writeFile(probe, "ok");
    await fs.unlink(probe);
    return true;
  } catch {
    return false;
  }
}

async function dbPath() {
  if (process.env.DATA_DIR) {
    await fs.mkdir(process.env.DATA_DIR, { recursive: true });
    return path.join(process.env.DATA_DIR, "db.json");
  }
  const localDir = path.join(process.cwd(), "data");
  if (await canWrite(localDir)) {
    return path.join(localDir, "db.json");
  }
  const tmp = "/tmp/halloween-houses";
  await fs.mkdir(tmp, { recursive: true });
  return path.join(tmp, "db.json");
}

async function readSeed(): Promise<DbFile> {
  const raw = await fs.readFile(SEED_PATH, "utf8");
  return JSON.parse(raw) as DbFile;
}

function normalizeHouse(house: House): House {
  const theme = HOUSE_THEMES.includes(house.theme as HouseTheme)
    ? (house.theme as HouseTheme)
    : "pumpkin";
  const treats = house.treats ?? [];
  const visit = effectiveVisit(house);
  const treatStock: TreatStock = { ...defaultTreatStock(treats), ...(house.treatStock ?? {}) };
  return {
    ...house,
    theme,
    arrival: house.arrival ?? "",
    accessible: Boolean(house.accessible),
    treats,
    visit,
    treatStock,
    soldOut: visit === "closed",
    adminFrozen: Boolean(house.adminFrozen),
    ownerFrozenUntil: house.ownerFrozenUntil ?? null,
    photoUrl: house.photoUrl ?? "",
  };
}

function normalizeDb(db: DbFile): DbFile {
  return { ...db, houses: db.houses.map(normalizeHouse) };
}

async function readFileDb(): Promise<DbFile> {
  const file = await dbPath();
  try {
    const raw = await fs.readFile(file, "utf8");
    return normalizeDb(JSON.parse(raw) as DbFile);
  } catch {
    const seed = normalizeDb(await readSeed());
    await fs.writeFile(file, JSON.stringify(seed, null, 2));
    return seed;
  }
}

async function writeFileDb(db: DbFile) {
  const file = await dbPath();
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, file);
}

function mergeDb(a: DbFile, b: DbFile): DbFile {
  const houses = mergeHouses(a.houses, b.houses).map(normalizeHouse);
  const updatedAt = a.updatedAt >= b.updatedAt ? a.updatedAt : b.updatedAt;
  return { houses, updatedAt };
}

let lastRemotePullAt = 0;

async function pullRemote(force: boolean): Promise<DbFile | null> {
  const url = remoteDbUrl();
  if (!url || !remoteHealthy()) return null;
  if (!force && Date.now() - lastRemotePullAt < REMOTE_PULL_MS) return null;
  try {
    const remote = await fetchRemoteDb(url);
    lastRemotePullAt = Date.now();
    rememberRemoteOk();
    return remote;
  } catch (error) {
    rememberRemoteError(error);
    return null;
  }
}

async function readDb(fresh = false): Promise<DbFile> {
  const file = await readFileDb();
  const remote = await pullRemote(fresh);
  if (!remote || remote.houses.length === 0) return file;
  const merged = mergeDb(file, remote);
  if (merged.houses.length !== file.houses.length || merged.updatedAt !== file.updatedAt) {
    await writeFileDb(merged);
  }
  return merged;
}

let mem: DbFile | null = null;
let memAt = 0;
let catalogMem: Catalog | null = null;

function setMem(db: DbFile) {
  mem = db;
  memAt = Date.now();
  catalogMem = null;
}

async function loadDb(fresh = false): Promise<DbFile> {
  if (!fresh && mem && Date.now() - memAt < MEM_TTL_MS) return mem;
  return withLock(async () => {
    if (!fresh && mem && Date.now() - memAt < MEM_TTL_MS) return mem;
    const db = await readDb(fresh);
    setMem(db);
    return db;
  });
}

async function runSyncedWrite<T>(fn: (db: DbFile) => T | Promise<T>): Promise<T> {
  return withLock(async () => {
    const file = await readFileDb();
    const url = remoteDbUrl();
    let snap: Awaited<ReturnType<typeof fetchRemoteSnapshot>> = null;
    if (url && remoteHealthy()) {
      try {
        snap = await fetchRemoteSnapshot(url);
        lastRemotePullAt = Date.now();
        rememberRemoteOk();
      } catch (error) {
        rememberRemoteError(error);
      }
    }
    const db = normalizeDb(snap ? mergeDb(file, snap.db) : cloneDb(file));
    const result = await fn(db);
    await writeFileDb(db);
    setMem(db);
    if (url && remoteHealthy()) {
      try {
        const ok = await persistRemote(url, snap?.db ?? null, db);
        if (ok) rememberRemoteOk();
      } catch (error) {
        rememberRemoteError(error);
      }
    }
    return result;
  });
}

export function asCatalog(houses: House[], updatedAt: string): Catalog {
  const published: PublicHouse[] = houses
    .filter((h) => isPubliclyListed(h))
    .map((h) => toPublicHouse(h));
  return {
    updatedAt,
    neighborhood: config.neighborhood,
    houses: published,
  };
}

export async function getCatalog(): Promise<Catalog> {
  const db = await loadDb();
  catalogMem = asCatalog(db.houses, db.updatedAt);
  return catalogMem;
}

export async function getAllHouses(): Promise<House[]> {
  const db = await loadDb(true);
  return db.houses;
}

export async function getHouse(id: string): Promise<House | undefined> {
  const db = await loadDb();
  return db.houses.find((h) => h.id === id);
}

export async function submitHouse(input: HouseInput) {
  await assertRealAddress(input);
  let id = "";
  let editCode = "";
  return runSyncedWrite((db) => {
    if (!id) {
      id = newPublicId();
      while (db.houses.some((h) => h.id === id)) id = newPublicId();
      editCode = newEditCode();
    }
    const already = db.houses.find((h) => h.id === id);
    if (already) return already;
    const now = new Date().toISOString();
    const visit: VisitState = input.visit ?? "come";
    const treats = input.treats;
    const house: House = {
      ...input,
      treats,
      treatStock: { ...defaultTreatStock(treats), ...(input.treatStock ?? {}) },
      visit,
      id,
      status: "approved",
      soldOut: visit === "closed",
      adminFrozen: false,
      ownerFrozenUntil: null,
      photoUrl: "",
      editCode,
      createdAt: now,
      updatedAt: now,
    };
    db.houses.push(house);
    db.updatedAt = now;
    return house;
  });
}

export async function updateByEditCode(
  id: string,
  editCode: string,
  patch: Partial<HouseInput> & NightPatch,
) {
  const current = await getHouse(id);
  if (!current || current.editCode !== editCode) return null;
  if (patch.address !== undefined || patch.lat !== undefined || patch.lng !== undefined) {
    await assertRealAddress({
      address: patch.address ?? current.address,
      lat: patch.lat ?? current.lat,
      lng: patch.lng ?? current.lng,
    });
  }
  return runSyncedWrite((db) => {
    const house = db.houses.find((h) => h.id === id);
    if (!house || house.editCode !== editCode) return null;
    if (patch.lat !== undefined && patch.lng !== undefined) {
      if (!inNeighborhood(patch.lat, patch.lng)) {
        throw new Error("OUT_OF_BOUNDS");
      }
    }
    const clean = sanitizeOwnerPatch(patch);
    if (clean.treatStock) {
      house.treatStock = { ...house.treatStock, ...clean.treatStock };
      delete clean.treatStock;
    }
    Object.assign(house, clean);
    if (house.photoUrl) {
      const parsed = parsePhotoUrl(house.photoUrl);
      if (parsed !== null) house.photoUrl = parsed;
    }
    house.updatedAt = new Date().toISOString();
    if (house.status === "rejected") house.status = "approved";
    db.updatedAt = house.updatedAt;
    return house;
  });
}

export async function adminUpdate(
  id: string,
  patch: Partial<HouseInput> & NightPatch & {
    status?: HouseStatus;
    rejectionReason?: string;
  },
) {
  const current = await getHouse(id);
  if (!current) return null;
  if (patch.address !== undefined || patch.lat !== undefined || patch.lng !== undefined) {
    await assertRealAddress({
      address: patch.address ?? current.address,
      lat: patch.lat ?? current.lat,
      lng: patch.lng ?? current.lng,
    });
  }
  return runSyncedWrite((db) => {
    const house = db.houses.find((h) => h.id === id);
    if (!house) return null;
    if (patch.lat !== undefined && patch.lng !== undefined) {
      if (!inNeighborhood(patch.lat, patch.lng)) {
        throw new Error("OUT_OF_BOUNDS");
      }
    }
    if (patch.name !== undefined) house.name = patch.name;
    if (patch.theme !== undefined) house.theme = patch.theme;
    if (patch.address !== undefined) house.address = patch.address;
    if (patch.arrival !== undefined) house.arrival = patch.arrival;
    if (patch.description !== undefined) house.description = patch.description;
    if (patch.lat !== undefined) house.lat = patch.lat;
    if (patch.lng !== undefined) house.lng = patch.lng;
    if (patch.treats !== undefined) house.treats = patch.treats;
    if (patch.treatStock !== undefined) house.treatStock = { ...house.treatStock, ...patch.treatStock };
    if (patch.visit !== undefined) house.visit = patch.visit;
    if (patch.scareLevel !== undefined) house.scareLevel = patch.scareLevel;
    if (patch.openFrom !== undefined) house.openFrom = patch.openFrom;
    if (patch.openTo !== undefined) house.openTo = patch.openTo;
    if (patch.notes !== undefined) house.notes = patch.notes;
    if (patch.accessible !== undefined) house.accessible = patch.accessible;
    if (patch.adminFrozen !== undefined) house.adminFrozen = patch.adminFrozen;
    if (patch.ownerFrozenUntil !== undefined) house.ownerFrozenUntil = patch.ownerFrozenUntil;
    if (patch.photoUrl !== undefined) house.photoUrl = parsePhotoUrl(patch.photoUrl) ?? patch.photoUrl;
    if (patch.visit !== undefined) house.soldOut = patch.visit === "closed";
    else if (patch.soldOut !== undefined) {
      house.soldOut = patch.soldOut;
      house.visit = patch.soldOut ? "closed" : house.visit === "closed" ? "come" : house.visit;
    }
    if (patch.status !== undefined) house.status = patch.status;
    if (patch.rejectionReason !== undefined) {
      house.rejectionReason = patch.rejectionReason;
    }
    if (patch.status === "approved") house.rejectionReason = undefined;
    house.updatedAt = new Date().toISOString();
    db.updatedAt = house.updatedAt;
    return house;
  });
}

function sanitizeOwnerPatch(
  patch: Partial<HouseInput> & NightPatch,
): Partial<House> {
  const next: Partial<House> = {};
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.theme !== undefined) next.theme = patch.theme;
  if (patch.address !== undefined) next.address = patch.address;
  if (patch.arrival !== undefined) next.arrival = patch.arrival;
  if (patch.description !== undefined) next.description = patch.description;
  if (patch.lat !== undefined) next.lat = patch.lat;
  if (patch.lng !== undefined) next.lng = patch.lng;
  if (patch.treats !== undefined) next.treats = patch.treats;
  if (patch.treatStock !== undefined) next.treatStock = patch.treatStock;
  if (patch.visit !== undefined) {
    next.visit = patch.visit;
    next.soldOut = patch.visit === "closed";
  } else if (patch.soldOut !== undefined) {
    next.soldOut = patch.soldOut;
    next.visit = patch.soldOut ? "closed" : "come";
  }
  if (patch.scareLevel !== undefined) next.scareLevel = patch.scareLevel;
  if (patch.openFrom !== undefined) next.openFrom = patch.openFrom;
  if (patch.openTo !== undefined) next.openTo = patch.openTo;
  if (patch.notes !== undefined) next.notes = patch.notes;
  if (patch.accessible !== undefined) next.accessible = patch.accessible;
  if (patch.ownerFrozenUntil !== undefined) next.ownerFrozenUntil = patch.ownerFrozenUntil;
  if (patch.photoUrl !== undefined) next.photoUrl = patch.photoUrl;
  return next;
}
