import { promises as fs } from "node:fs";
import path from "node:path";
import { get as getBlob, put as putBlob } from "@vercel/blob";
import { newEditCode, newPublicId, toPublicHouse } from "@/lib/ids";
import { inNeighborhood } from "@/lib/config";
import { config } from "@/lib/config";
import { assertRealAddress } from "@/lib/geocode";
import { defaultTreatStock, effectiveVisit, isPubliclyListed } from "@/lib/house-state";
import { cloneDb, mergeHouses } from "@/lib/catalog-sync";
import { parsePhotoUrl } from "@/lib/photos";
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
const BLOB_PATH = "halloween-houses/db.json";
const MEM_TTL_MS = 1500;

let chain: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

type GlobalBag = { __hwHouseDb?: DbFile };

function stamp(value: { updatedAt: string }) {
  const n = Date.parse(value.updatedAt);
  return Number.isFinite(n) ? n : 0;
}

function getGlobalDb(): DbFile | null {
  const db = (globalThis as GlobalBag).__hwHouseDb;
  return db ? cloneDb(db) : null;
}

function setGlobalDb(db: DbFile) {
  (globalThis as GlobalBag).__hwHouseDb = cloneDb(db);
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
  const treats = Array.isArray(house.treats) ? house.treats : [];
  const visit = effectiveVisit(house);
  const treatStock: TreatStock = {
    ...defaultTreatStock(treats),
    ...(house.treatStock ?? {}),
  };
  if (treats.includes("candy") && !treatStock.candy) treatStock.candy = "plenty";
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
    openFrom2: house.openFrom2 ?? "",
    openTo2: house.openTo2 ?? "",
  };
}

function normalizeDb(db: DbFile): DbFile {
  return { ...db, houses: db.houses.map(normalizeHouse) };
}

function blobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readBlobDb(): Promise<DbFile | null> {
  if (!blobEnabled()) return null;
  try {
    const result = await getBlob(BLOB_PATH, {
      access: "private",
      useCache: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result?.stream) return null;
    const text = await new Response(result.stream).text();
    return normalizeDb(JSON.parse(text) as DbFile);
  } catch {
    return null;
  }
}

async function writeBlobDb(db: DbFile) {
  if (!blobEnabled()) return;
  try {
    await putBlob(BLOB_PATH, JSON.stringify(db), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      cacheControlMaxAge: 0,
    });
  } catch {
    /* keep file/memory copy even if blob write fails */
  }
}

async function readLocalFileDb(): Promise<DbFile | null> {
  try {
    const file = await dbPath();
    const raw = await fs.readFile(file, "utf8");
    return normalizeDb(JSON.parse(raw) as DbFile);
  } catch {
    return null;
  }
}

async function writeFileDb(db: DbFile) {
  const file = await dbPath();
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, file);
}

function pickNewest(...candidates: Array<DbFile | null | undefined>): DbFile | null {
  let best: DbFile | null = null;
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (!best || stamp(candidate) >= stamp(best)) best = candidate;
  }
  return best;
}

async function readFileDb(): Promise<DbFile> {
  const [local, blob, global] = await Promise.all([
    readLocalFileDb(),
    readBlobDb(),
    Promise.resolve(getGlobalDb()),
  ]);
  const newest = pickNewest(local, blob, global);
  if (newest) return newest;
  const seed = normalizeDb(await readSeed());
  try {
    await writeFileDb(seed);
  } catch {
    /* /tmp may still work later */
  }
  void writeBlobDb(seed);
  return seed;
}

let mem: DbFile | null = null;
let memAt = 0;
let catalogMem: Catalog | null = null;

function setMem(db: DbFile) {
  mem = db;
  memAt = Date.now();
  catalogMem = null;
  setGlobalDb(db);
}

async function persistDb(db: DbFile) {
  setMem(db);
  try {
    await writeFileDb(db);
  } catch {
    /* memory/blob still hold the write */
  }
  await writeBlobDb(db);
}

async function loadDb(fresh = false): Promise<DbFile> {
  if (!fresh && mem && Date.now() - memAt < MEM_TTL_MS) return mem;
  return withLock(async () => {
    if (!fresh && mem && Date.now() - memAt < MEM_TTL_MS) return mem;
    const db = await readFileDb();
    const global = getGlobalDb();
    const chosen = pickNewest(db, global) ?? db;
    setMem(chosen);
    if (global && stamp(global) > stamp(db)) {
      void persistDb(chosen);
    }
    return chosen;
  });
}

async function runSyncedWrite<T>(fn: (db: DbFile) => T | Promise<T>): Promise<T> {
  return withLock(async () => {
    const db = normalizeDb(cloneDb(await readFileDb()));
    const global = getGlobalDb();
    if (global && stamp(global) > stamp(db)) {
      Object.assign(db, normalizeDb(cloneDb(global)));
    }
    const result = await fn(db);
    await persistDb(db);
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

export async function getDbSnapshot(): Promise<DbFile> {
  return loadDb(true);
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
    const treats = Array.isArray(input.treats) ? input.treats : [];
    const treatStock: TreatStock = {
      ...defaultTreatStock(treats),
      ...(input.treatStock ?? {}),
    };
    if (treats.includes("candy") && !treatStock.candy) treatStock.candy = "plenty";
    const house: House = {
      ...input,
      treats,
      treatStock,
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

export async function adminDeleteHouse(id: string) {
  return runSyncedWrite((db) => {
    const idx = db.houses.findIndex((h) => h.id === id);
    if (idx < 0) return false;
    db.houses.splice(idx, 1);
    db.updatedAt = new Date().toISOString();
    return true;
  });
}

/** Merge a manager-device backup so approvals survive ephemeral serverless disks. */
export async function adminRestoreDb(incoming: DbFile) {
  return runSyncedWrite((db) => {
    const mergedHouses = mergeHouses(db.houses, normalizeDb(incoming).houses).map((house) => {
      const local = db.houses.find((h) => h.id === house.id);
      const remote = incoming.houses.find((h) => h.id === house.id);
      if (!local || !remote) return normalizeHouse(house);
      if (remote.status === "approved" && local.status !== "approved") {
        return normalizeHouse({ ...house, status: "approved", rejectionReason: undefined });
      }
      return normalizeHouse(house);
    });
    db.houses = mergedHouses;
    db.updatedAt = new Date(
      Math.max(stamp(db), stamp(incoming), Date.now()),
    ).toISOString();
    return cloneDb(db);
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
    if (patch.openFrom2 !== undefined) house.openFrom2 = patch.openFrom2;
    if (patch.openTo2 !== undefined) house.openTo2 = patch.openTo2;
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
  if (patch.openFrom2 !== undefined) next.openFrom2 = patch.openFrom2;
  if (patch.openTo2 !== undefined) next.openTo2 = patch.openTo2;
  if (patch.notes !== undefined) next.notes = patch.notes;
  if (patch.accessible !== undefined) next.accessible = patch.accessible;
  if (patch.ownerFrozenUntil !== undefined) next.ownerFrozenUntil = patch.ownerFrozenUntil;
  if (patch.photoUrl !== undefined) next.photoUrl = patch.photoUrl;
  return next;
}
