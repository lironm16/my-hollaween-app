import { promises as fs } from "node:fs";
import path from "node:path";
import { newEditCode, newPublicId, toPublicHouse } from "@/lib/ids";
import { inNeighborhood } from "@/lib/config";
import { config } from "@/lib/config";
import type {
  Catalog,
  DbFile,
  House,
  HouseInput,
  HouseStatus,
  PublicHouse,
} from "@/lib/types";

const SEED_PATH = path.join(process.cwd(), "data", "seed.json");

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
  return {
    ...house,
    accessible: Boolean(house.accessible),
    soldOut: Boolean(house.soldOut),
  };
}

async function readDb(): Promise<DbFile> {
  const file = await dbPath();
  try {
    const raw = await fs.readFile(file, "utf8");
    const db = JSON.parse(raw) as DbFile;
    return { ...db, houses: db.houses.map(normalizeHouse) };
  } catch {
    const seed = await readSeed();
    const normalized = { ...seed, houses: seed.houses.map(normalizeHouse) };
    await fs.writeFile(file, JSON.stringify(normalized, null, 2));
    return normalized;
  }
}

let mem: DbFile | null = null;
let catalogMem: Catalog | null = null;
let loadOnce: Promise<DbFile> | null = null;

function setMem(db: DbFile) {
  mem = db;
  catalogMem = asCatalog(db.houses, db.updatedAt);
}

async function ensureDb(): Promise<DbFile> {
  if (mem) return mem;
  if (!loadOnce) {
    loadOnce = readDb().then((db) => {
      setMem(db);
      return db;
    });
  }
  return loadOnce;
}

async function writeDb(db: DbFile) {
  const file = await dbPath();
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, file);
  setMem(db);
}

export function asCatalog(houses: House[], updatedAt: string): Catalog {
  const published: PublicHouse[] = houses
    .filter((h) => h.status === "approved")
    .map((h) => toPublicHouse(h));
  return {
    updatedAt,
    neighborhood: config.neighborhood,
    houses: published,
  };
}

export async function getCatalog(): Promise<Catalog> {
  await ensureDb();
  return catalogMem as Catalog;
}

export async function getAllHouses(): Promise<House[]> {
  const db = await ensureDb();
  return db.houses;
}

export async function getHouse(id: string): Promise<House | undefined> {
  const db = await ensureDb();
  return db.houses.find((h) => h.id === id);
}

export async function submitHouse(input: HouseInput) {
  if (!inNeighborhood(input.lat, input.lng)) {
    throw new Error("OUT_OF_BOUNDS");
  }
  return withLock(async () => {
    const db = await ensureDb();
    const now = new Date().toISOString();
    let id = newPublicId();
    while (db.houses.some((h) => h.id === id)) id = newPublicId();
    const house: House = {
      ...input,
      id,
      status: "pending",
      soldOut: false,
      editCode: newEditCode(),
      createdAt: now,
      updatedAt: now,
    };
    db.houses.push(house);
    db.updatedAt = now;
    await writeDb(db);
    return house;
  });
}

export async function updateByEditCode(
  id: string,
  editCode: string,
  patch: Partial<HouseInput> & { soldOut?: boolean },
) {
  return withLock(async () => {
    const db = await ensureDb();
    const house = db.houses.find((h) => h.id === id);
    if (!house || house.editCode !== editCode) return null;
    if (patch.lat !== undefined && patch.lng !== undefined) {
      if (!inNeighborhood(patch.lat, patch.lng)) {
        throw new Error("OUT_OF_BOUNDS");
      }
    }
    Object.assign(house, sanitizeOwnerPatch(patch));
    house.updatedAt = new Date().toISOString();
    if (house.status === "rejected") house.status = "pending";
    db.updatedAt = house.updatedAt;
    await writeDb(db);
    return house;
  });
}

export async function adminUpdate(
  id: string,
  patch: Partial<HouseInput> & {
    status?: HouseStatus;
    soldOut?: boolean;
    rejectionReason?: string;
  },
) {
  return withLock(async () => {
    const db = await ensureDb();
    const house = db.houses.find((h) => h.id === id);
    if (!house) return null;
    if (patch.lat !== undefined && patch.lng !== undefined) {
      if (!inNeighborhood(patch.lat, patch.lng)) {
        throw new Error("OUT_OF_BOUNDS");
      }
    }
    if (patch.name !== undefined) house.name = patch.name;
    if (patch.address !== undefined) house.address = patch.address;
    if (patch.description !== undefined) house.description = patch.description;
    if (patch.lat !== undefined) house.lat = patch.lat;
    if (patch.lng !== undefined) house.lng = patch.lng;
    if (patch.treats !== undefined) house.treats = patch.treats;
    if (patch.scareLevel !== undefined) house.scareLevel = patch.scareLevel;
    if (patch.openFrom !== undefined) house.openFrom = patch.openFrom;
    if (patch.openTo !== undefined) house.openTo = patch.openTo;
    if (patch.notes !== undefined) house.notes = patch.notes;
    if (patch.accessible !== undefined) house.accessible = patch.accessible;
    if (patch.soldOut !== undefined) house.soldOut = patch.soldOut;
    if (patch.status !== undefined) house.status = patch.status;
    if (patch.rejectionReason !== undefined) {
      house.rejectionReason = patch.rejectionReason;
    }
    if (patch.status === "approved") house.rejectionReason = undefined;
    house.updatedAt = new Date().toISOString();
    db.updatedAt = house.updatedAt;
    await writeDb(db);
    return house;
  });
}

function sanitizeOwnerPatch(
  patch: Partial<HouseInput> & { soldOut?: boolean },
): Partial<House> {
  const next: Partial<House> = {};
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.address !== undefined) next.address = patch.address;
  if (patch.description !== undefined) next.description = patch.description;
  if (patch.lat !== undefined) next.lat = patch.lat;
  if (patch.lng !== undefined) next.lng = patch.lng;
  if (patch.treats !== undefined) next.treats = patch.treats;
  if (patch.scareLevel !== undefined) next.scareLevel = patch.scareLevel;
  if (patch.openFrom !== undefined) next.openFrom = patch.openFrom;
  if (patch.openTo !== undefined) next.openTo = patch.openTo;
  if (patch.notes !== undefined) next.notes = patch.notes;
  if (patch.accessible !== undefined) next.accessible = patch.accessible;
  if (patch.soldOut !== undefined) next.soldOut = patch.soldOut;
  return next;
}
