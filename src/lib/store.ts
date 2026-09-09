import { promises as fs } from "node:fs";
import path from "node:path";
import { get as getBlob, put as putBlob } from "@vercel/blob";
import { canonicalAddressForBuilding } from "@/lib/house-clusters";
import { canonicalHouseId, newEditCode, newPublicId, sameHouseId, toPublicHouse } from "@/lib/ids";
import { inNeighborhood } from "@/lib/config";
import { config } from "@/lib/config";
import { assertRealAddress } from "@/lib/geocode";
import { defaultTreatStock, effectiveVisit, isPubliclyListed, syncDecorFields } from "@/lib/house-state";
import { houseHoursWindows, syncHoursFields } from "@/lib/hours";
import { cloneDb, mergeHouses, mergePushSubscriptions } from "@/lib/catalog-sync";
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
  type PushSubscriptionRecord,
  type TreatStock,
  type VisitState,
} from "@/lib/types";
import {
  ensureVapid,
  payloadForKind,
  sanitizePushPayload,
  sendPushToSubscriptions,
  type PushPayload,
} from "@/lib/push";
import { subscriptionAllowsTopic } from "@/lib/push-topics";
import {
  AUTO_PUSH_KINDS,
  PUSH_KINDS,
  classifyHouseAlert,
  houseMatchesNotifyKind,
  mergePushTemplates,
  ownerOfferKindFromPatch,
  type PushKind,
  type StoredPushSettings,
} from "@/lib/push-templates";

const SEED_PATH = path.join(process.cwd(), "data", "seed.json");
const BLOB_PATH = "halloween-houses/db.json";
const PUSH_BLOB_PATH = "halloween-houses/push-settings.json";
const PUSH_SUBS_BLOB_PATH = "halloween-houses/push-subscriptions.json";
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
  const hours = syncHoursFields(houseHoursWindows(house));
  const decor = syncDecorFields(house);
  return {
    ...house,
    theme,
    arrival: house.arrival ?? "",
    accessible: Boolean(house.accessible),
    decorLevel: decor.decorLevel,
    decorated: decor.decorated,
    treats,
    visit,
    treatStock,
    soldOut: visit === "closed",
    adminFrozen: Boolean(house.adminFrozen),
    ownerFrozenUntil: house.ownerFrozenUntil ?? null,
    photoUrl: house.photoUrl ?? "",
    openHours: hours.openHours,
    openFrom: hours.openFrom,
    openTo: hours.openTo,
    openFrom2: hours.openFrom2,
    openTo2: hours.openTo2,
  };
}

function normalizeDb(db: DbFile): DbFile {
  return {
    ...db,
    houses: db.houses.filter((house) => house.id !== "בית-9316").map(normalizeHouse),
    pushSubscriptions: Array.isArray(db.pushSubscriptions) ? db.pushSubscriptions : [],
    vapid: db.vapid?.publicKey && db.vapid?.privateKey ? db.vapid : undefined,
    pushSettings: db.pushSettings?.templates
      ? {
          updatedAt: db.pushSettings.updatedAt,
          templates: { ...db.pushSettings.templates },
        }
      : undefined,
  };
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
  await putBlob(BLOB_PATH, JSON.stringify(db), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    cacheControlMaxAge: 0,
  });
}

async function readPushSettingsBlob(): Promise<DbFile["pushSettings"] | null> {
  if (!blobEnabled()) return null;
  try {
    const result = await getBlob(PUSH_BLOB_PATH, {
      access: "private",
      useCache: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result?.stream) return null;
    const parsed = JSON.parse(await new Response(result.stream).text()) as DbFile["pushSettings"];
    if (!parsed?.templates) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writePushSettingsBlob(settings: DbFile["pushSettings"]) {
  if (!blobEnabled() || !settings?.templates) return;
  try {
    await putBlob(PUSH_BLOB_PATH, JSON.stringify(settings), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      cacheControlMaxAge: 0,
    });
  } catch {
    /* house db still holds a copy */
  }
}

async function pushSubsFilePath() {
  if (process.env.DATA_DIR) {
    await fs.mkdir(process.env.DATA_DIR, { recursive: true });
    return path.join(process.env.DATA_DIR, "push-subscriptions.json");
  }
  const localDir = path.join(process.cwd(), "data");
  if (await canWrite(localDir)) {
    return path.join(localDir, "push-subscriptions.json");
  }
  const tmp = "/tmp/halloween-houses";
  await fs.mkdir(tmp, { recursive: true });
  return path.join(tmp, "push-subscriptions.json");
}

async function readLocalPushSubsBlob(): Promise<PushSubscriptionRecord[] | null> {
  try {
    const raw = await fs.readFile(await pushSubsFilePath(), "utf8");
    const parsed = JSON.parse(raw) as { subscriptions?: PushSubscriptionRecord[] };
    return Array.isArray(parsed.subscriptions) ? parsed.subscriptions : null;
  } catch {
    return null;
  }
}

async function readPushSubsBlob(): Promise<PushSubscriptionRecord[] | null> {
  const [local, remote] = await Promise.all([
    readLocalPushSubsBlob(),
    blobEnabled()
      ? getBlob(PUSH_SUBS_BLOB_PATH, {
          access: "private",
          useCache: false,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        })
          .then(async (result) => {
            if (!result?.stream) return null;
            const parsed = JSON.parse(await new Response(result.stream).text()) as {
              subscriptions?: PushSubscriptionRecord[];
            };
            return Array.isArray(parsed.subscriptions) ? parsed.subscriptions : null;
          })
          .catch(() => null)
      : Promise.resolve(null),
  ]);
  return mergePushSubscriptions(local, remote);
}

async function writePushSubsBlob(subscriptions: PushSubscriptionRecord[]) {
  const payload = JSON.stringify({
    updatedAt: new Date().toISOString(),
    subscriptions,
  });
  try {
    const file = await pushSubsFilePath();
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, payload);
    await fs.rename(tmp, file);
  } catch {
    /* blob/memory may still hold it */
  }
  if (!blobEnabled()) return;
  try {
    await putBlob(PUSH_SUBS_BLOB_PATH, payload, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      cacheControlMaxAge: 0,
    });
  } catch {
    /* local file still holds it */
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

function pushSettingsStamp(settings?: DbFile["pushSettings"] | null) {
  const raw = settings?.updatedAt ?? "";
  const n = Date.parse(raw);
  return Number.isFinite(n) ? n : 0;
}

function pickPushSettings(...candidates: Array<DbFile | null | undefined>): DbFile["pushSettings"] {
  let best: DbFile["pushSettings"] = undefined;
  let bestStamp = -1;
  for (const candidate of candidates) {
    if (!candidate?.pushSettings?.templates) continue;
    const t = pushSettingsStamp(candidate.pushSettings);
    if (t > bestStamp) {
      bestStamp = t;
      best = candidate.pushSettings;
    }
  }
  return best;
}

function asPushCandidate(settings?: DbFile["pushSettings"] | null): DbFile | null {
  if (!settings?.templates) return null;
  return { updatedAt: settings.updatedAt ?? "", houses: [], pushSettings: settings };
}

function foldPushSettings(db: DbFile, ...candidates: Array<DbFile | null | undefined>) {
  const newest = pickPushSettings(db, ...candidates);
  if (newest) db.pushSettings = newest;
}

function liveDb(): DbFile | null {
  return mem ?? getGlobalDb();
}

function isStaleSnapshot(db: DbFile) {
  const live = liveDb();
  return Boolean(live && stamp(live) > stamp(db));
}

function pickNewest(...candidates: Array<DbFile | null | undefined>): DbFile | null {
  let best: DbFile | null = null;
  const present: DbFile[] = [];
  for (const candidate of candidates) {
    if (!candidate) continue;
    present.push(candidate);
    if (!best || stamp(candidate) > stamp(best)) {
      best = candidate;
      continue;
    }
    if (stamp(candidate) === stamp(best)) {
      const nextSubs = candidate.pushSubscriptions?.length ?? 0;
      const bestSubs = best.pushSubscriptions?.length ?? 0;
      if (nextSubs > bestSubs) best = candidate;
    }
  }
  if (!best) return null;
  const pushSettings = pickPushSettings(...candidates) ?? best.pushSettings;
  // Keep every subscription across overlapping writes — a newer house save must not
  // drop push subscribers that lived in an older snapshot.
  const pushSubscriptions = mergePushSubscriptions(
    ...present.map((item) => item.pushSubscriptions),
  );
  return {
    ...best,
    pushSubscriptions,
    ...(pushSettings ? { pushSettings } : {}),
  };
}

function foldPushSubscriptions(target: DbFile, ...candidates: Array<DbFile | null | undefined>) {
  target.pushSubscriptions = mergePushSubscriptions(
    target.pushSubscriptions,
    ...candidates.map((item) => item?.pushSubscriptions),
  );
}

async function readFileDb(): Promise<DbFile> {
  const [local, blob, global, pushBlob, pushSubsBlob] = await Promise.all([
    readLocalFileDb(),
    readBlobDb(),
    Promise.resolve(getGlobalDb()),
    readPushSettingsBlob(),
    readPushSubsBlob(),
  ]);
  const newest = pickNewest(local, blob, global);
  const pushSettings = pickPushSettings(
    newest,
    local,
    blob,
    global,
    pushBlob ? { updatedAt: pushBlob.updatedAt ?? "", houses: [], pushSettings: pushBlob } : null,
  );
  if (newest) {
    const merged = pushSettings ? { ...newest, pushSettings } : newest;
    merged.pushSubscriptions = mergePushSubscriptions(merged.pushSubscriptions, pushSubsBlob);
    return merged;
  }
  const seed = normalizeDb(await readSeed());
  try {
    await writeFileDb(seed);
  } catch {
    /* /tmp may still work later */
  }
  void writeBlobDb(seed).catch(() => undefined);
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

async function persistPushSettings(
  settings: DbFile["pushSettings"],
  existingStamp: number,
) {
  if (!settings?.templates) return;
  if (pushSettingsStamp(settings) < existingStamp) return;
  await writePushSettingsBlob(settings);
}

async function persistDb(db: DbFile) {
  const pushBlob = await readPushSettingsBlob();
  const blobWrapper = asPushCandidate(pushBlob);
  const blobStamp = pushSettingsStamp(pushBlob);
  foldPushSettings(db, mem, getGlobalDb(), blobWrapper);

  if (isStaleSnapshot(db)) {
    const live = liveDb();
    if (live) {
      live.houses = mergeHouses(live.houses, db.houses);
      if (stamp(db) > stamp(live)) live.updatedAt = db.updatedAt;
      foldPushSettings(live, db, blobWrapper);
      foldPushSubscriptions(live, db);
      if (mem) {
        mem.houses = live.houses;
        mem.updatedAt = live.updatedAt;
        mem.pushSettings = live.pushSettings;
        mem.pushSubscriptions = live.pushSubscriptions;
      }
      setGlobalDb(live);
      try {
        await persistPushSettings(live.pushSettings, blobStamp);
      } catch {
        /* live house data stays in memory */
      }
      try {
        if (blobEnabled()) await writeBlobDb(live);
        else await writeFileDb(live);
      } catch {
        /* memory still holds the merged houses */
      }
      setMem(live);
    }
    return;
  }

  try {
    await persistPushSettings(db.pushSettings, blobStamp);
  } catch {
    /* house db still stores a copy */
  }

  if (isStaleSnapshot(db)) {
    const live = liveDb();
    if (live) {
      live.houses = mergeHouses(live.houses, db.houses);
      if (stamp(db) > stamp(live)) live.updatedAt = db.updatedAt;
      foldPushSettings(live, db);
      foldPushSubscriptions(live, db);
      if (mem) {
        mem.houses = live.houses;
        mem.updatedAt = live.updatedAt;
        mem.pushSettings = live.pushSettings;
        mem.pushSubscriptions = live.pushSubscriptions;
      }
      setGlobalDb(live);
      try {
        if (blobEnabled()) await writeBlobDb(live);
        else await writeFileDb(live);
      } catch {
        /* memory still holds the merged houses */
      }
      setMem(live);
    }
    return;
  }

  if (blobEnabled()) {
    try {
      await writeBlobDb(db);
    } catch {
      throw new Error("PERSIST_FAILED");
    }
    try {
      await writeFileDb(db);
    } catch {
      /* blob already holds the write */
    }
  } else {
    try {
      await writeFileDb(db);
    } catch {
      throw new Error("PERSIST_FAILED");
    }
  }

  if (isStaleSnapshot(db)) {
    const live = liveDb();
    if (live) {
      live.houses = mergeHouses(live.houses, db.houses);
      if (stamp(db) > stamp(live)) live.updatedAt = db.updatedAt;
      foldPushSettings(live, db);
      foldPushSubscriptions(live, db);
      if (mem) {
        mem.houses = live.houses;
        mem.updatedAt = live.updatedAt;
        mem.pushSettings = live.pushSettings;
        mem.pushSubscriptions = live.pushSubscriptions;
      }
      setGlobalDb(live);
      setMem(live);
    }
    return;
  }

  setMem(db);
}

async function loadDb(fresh = false): Promise<DbFile> {
  if (!fresh && mem && Date.now() - memAt < MEM_TTL_MS) return mem;
  return withLock(async () => {
    if (!fresh && mem && Date.now() - memAt < MEM_TTL_MS) return mem;
    const db = await readFileDb();
    const global = getGlobalDb();
    const chosen = pickNewest(db, global) ?? db;
    foldPushSubscriptions(chosen, mem, global);
    setMem(chosen);
    return chosen;
  });
}

async function runSyncedWrite<T>(fn: (db: DbFile) => T | Promise<T>): Promise<T> {
  return withLock(async () => {
    const db = normalizeDb(cloneDb(await readFileDb()));
    const keptPush = db.pushSettings;
    const global = getGlobalDb();
    if (global && stamp(global) > stamp(db)) {
      Object.assign(db, normalizeDb(cloneDb(global)));
    }
    foldPushSettings(db, asPushCandidate(keptPush), mem, global);
    foldPushSubscriptions(db, mem, global);
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

function findHouseIn(houses: House[], id: string): House | undefined {
  const needle = canonicalHouseId(id);
  if (!needle) return undefined;
  return houses.find((house) => sameHouseId(house.id, needle));
}

export async function getHouse(id: string): Promise<House | undefined> {
  const found = findHouseIn((await loadDb()).houses, id);
  if (found) return found;
  return findHouseIn((await loadDb(true)).houses, id);
}

export async function submitHouse(
  input: HouseInput,
  options?: { includeEndpoint?: string },
) {
  await assertRealAddress(input);
  let id = "";
  let editCode = "";
  const house = await runSyncedWrite((db) => {
    if (!id) {
      id = newPublicId();
      while (db.houses.some((h) => sameHouseId(h.id, id))) id = newPublicId();
      editCode = newEditCode();
    }
    const already = findHouseIn(db.houses, id);
    if (already) return already;
    const now = new Date().toISOString();
    const visit: VisitState = input.visit ?? "come";
    const treats = Array.isArray(input.treats) ? input.treats : [];
    const treatStock: TreatStock = {
      ...defaultTreatStock(treats),
      ...(input.treatStock ?? {}),
    };
    if (treats.includes("candy") && !treatStock.candy) treatStock.candy = "plenty";
    const hours = syncHoursFields(
      input.openHours?.length
        ? input.openHours
        : houseHoursWindows(input),
    );
    const decor = syncDecorFields({ ...input, visit });
    const house: House = {
      ...input,
      address: canonicalAddressForBuilding(input.address, db.houses),
      treats,
      treatStock,
      visit,
      ...hours,
      id,
      decorLevel: decor.decorLevel,
      decorated: decor.decorated,
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
  const push = await dispatchHousePush(null, house, "houseAdded", undefined, options?.includeEndpoint);
  return { house, push };
}

export async function updateByEditCode(
  id: string,
  editCode: string,
  patch: Partial<HouseInput> & NightPatch,
  options?: { includeEndpoint?: string },
) {
  const current = await getHouse(id);
  if (!current) return { error: "missing" as const };
  if (current.editCode !== editCode) return { error: "forbidden" as const };
  const prev = snapshotHouse(current);
  if (patch.address !== undefined || patch.lat !== undefined || patch.lng !== undefined) {
    await assertRealAddress({
      address: patch.address ?? current.address,
      lat: patch.lat ?? current.lat,
      lng: patch.lng ?? current.lng,
    });
  }
  const updated = await runSyncedWrite((db) => {
    const house = findHouseIn(db.houses, id);
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
    const decor = syncDecorFields(house);
    house.decorLevel = decor.decorLevel;
    house.decorated = decor.decorated;
    house.updatedAt = new Date().toISOString();
    if (house.status === "rejected") house.status = "approved";
    db.updatedAt = house.updatedAt;
    return house;
  });
  if (!updated) return { error: "missing" as const };
  const push = await dispatchHousePush(prev, updated, undefined, patch, options?.includeEndpoint);
  return { house: updated, push };
}

export async function deleteByEditCode(id: string, editCode: string) {
  return runSyncedWrite((db) => {
    const idx = db.houses.findIndex((h) => sameHouseId(h.id, id) && h.editCode === editCode);
    if (idx < 0) return false;
    db.houses.splice(idx, 1);
    db.updatedAt = new Date().toISOString();
    return true;
  });
}

export async function adminDeleteHouse(id: string) {
  return runSyncedWrite((db) => {
    const idx = db.houses.findIndex((h) => sameHouseId(h.id, id));
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
    if (incoming.vapid?.publicKey && incoming.vapid?.privateKey) {
      db.vapid = incoming.vapid;
    }
    if (incoming.pushSubscriptions && incoming.pushSubscriptions.length > 0) {
      db.pushSubscriptions = incoming.pushSubscriptions;
    }
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
  options?: { includeEndpoint?: string },
) {
  const current = await getHouse(id);
  if (!current) return null;
  const prev = snapshotHouse(current);
  if (patch.address !== undefined || patch.lat !== undefined || patch.lng !== undefined) {
    await assertRealAddress({
      address: patch.address ?? current.address,
      lat: patch.lat ?? current.lat,
      lng: patch.lng ?? current.lng,
    });
  }
  const updated = await runSyncedWrite((db) => {
    const house = findHouseIn(db.houses, id);
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
    if (patch.openHours !== undefined || patch.openFrom !== undefined || patch.openTo !== undefined || patch.openFrom2 !== undefined || patch.openTo2 !== undefined) {
      const synced = syncHoursFields(
        patch.openHours?.length
          ? patch.openHours
          : houseHoursWindows({
              openFrom: house.openFrom,
              openTo: house.openTo,
              openFrom2: house.openFrom2,
              openTo2: house.openTo2,
              openHours: house.openHours,
            }),
      );
      house.openHours = synced.openHours;
      house.openFrom = synced.openFrom;
      house.openTo = synced.openTo;
      house.openFrom2 = synced.openFrom2;
      house.openTo2 = synced.openTo2;
    }
    if (patch.notes !== undefined) house.notes = patch.notes;
    if (patch.accessible !== undefined) house.accessible = patch.accessible;
    if (
      patch.decorLevel !== undefined ||
      patch.decorated !== undefined ||
      patch.visit === "decorOnly"
    ) {
      const decor = syncDecorFields({
        ...house,
        decorLevel: patch.decorLevel ?? house.decorLevel,
        decorated: patch.decorated ?? house.decorated,
        visit: patch.visit ?? house.visit,
      });
      house.decorLevel = decor.decorLevel;
      house.decorated = decor.decorated;
    }
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
  if (!updated) return null;
  const push = await dispatchHousePush(prev, updated, undefined, patch, options?.includeEndpoint);
  return { house: updated, push };
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
  if (patch.openHours !== undefined || patch.openFrom !== undefined || patch.openTo !== undefined) {
    const synced = syncHoursFields(
      patch.openHours?.length
        ? patch.openHours
        : houseHoursWindows({
            openFrom: patch.openFrom,
            openTo: patch.openTo,
            openFrom2: patch.openFrom2,
            openTo2: patch.openTo2,
            openHours: patch.openHours,
          }),
    );
    next.openHours = synced.openHours;
    next.openFrom = synced.openFrom;
    next.openTo = synced.openTo;
    next.openFrom2 = synced.openFrom2;
    next.openTo2 = synced.openTo2;
  }
  if (patch.notes !== undefined) next.notes = patch.notes;
  if (patch.accessible !== undefined) next.accessible = patch.accessible;
  if (patch.decorLevel !== undefined) next.decorLevel = patch.decorLevel;
  if (patch.decorated !== undefined) next.decorated = patch.decorated;
  if (patch.ownerFrozenUntil !== undefined) next.ownerFrozenUntil = patch.ownerFrozenUntil;
  if (patch.photoUrl !== undefined) next.photoUrl = patch.photoUrl;
  return next;
}

export type HousePushResult = {
  kind: PushKind;
  autoSent?: boolean;
  title?: string;
  body?: string;
  offer?: { kind: PushKind; title: string; body: string };
};

async function dispatchHousePush(
  prev: House | null,
  next: House,
  forcedKind?: PushKind,
  patch?: { visit?: VisitState; treatStock?: TreatStock },
  includeEndpoint?: string,
): Promise<HousePushResult | undefined> {
  const kind =
    forcedKind ??
    (prev ? classifyHouseAlert(prev, next) : "houseAdded") ??
    ownerOfferKindFromPatch(patch, next);
  if (!kind) return;
  const stored = (await loadDb()).pushSettings as StoredPushSettings | undefined;
  const payload = payloadForKind(kind, next, stored);
  if (!payload) return { kind };
  if (AUTO_PUSH_KINDS.has(kind)) {
    void broadcastPush(payload, includeEndpoint).catch(() => undefined);
    return { kind, autoSent: true, title: payload.title, body: payload.body };
  }
  return { kind, offer: { kind, title: payload.title, body: payload.body } };
}

export async function getPushTemplateList() {
  const db = await loadDb();
  return Object.values(mergePushTemplates(db.pushSettings));
}

export async function savePushTemplates(input: StoredPushSettings) {
  await runSyncedWrite((db) => {
    const merged = mergePushTemplates({
      templates: {
        ...db.pushSettings?.templates,
        ...input.templates,
      },
    });
    const templates: NonNullable<StoredPushSettings["templates"]> = {};
    for (const id of PUSH_KINDS) {
      templates[id] = {
        enabled: merged[id].enabled,
        title: merged[id].title,
        body: merged[id].body,
      };
    }
    db.pushSettings = { updatedAt: new Date().toISOString(), templates };
    db.updatedAt = new Date().toISOString();
  });
  return getPushTemplateList();
}

export async function notifyHouseKind(options: {
  id: string;
  kind: PushKind;
  editCode?: string;
  admin?: boolean;
  ownerSession?: boolean;
  includeEndpoint?: string;
}) {
  const house = await getHouse(options.id);
  if (!house) return { error: "missing" as const };
  if (!options.admin && !options.ownerSession && house.editCode !== options.editCode) {
    return { error: "forbidden" as const };
  }
  if (AUTO_PUSH_KINDS.has(options.kind) && !options.admin) return { error: "auto" as const };
  if (!houseMatchesNotifyKind(house, options.kind)) return { error: "mismatch" as const };
  const stored = (await loadDb()).pushSettings as StoredPushSettings | undefined;
  const payload = payloadForKind(options.kind, house, stored);
  if (!payload) return { error: "disabled" as const };
  const result = await broadcastPush(payload, options.includeEndpoint);
  return { ok: true as const, ...result, title: payload.title, body: payload.body };
}

function snapshotHouse(house: House): House {
  return {
    ...house,
    treats: [...house.treats],
    treatStock: { ...house.treatStock },
  };
}

export async function getVapidPublicKey() {
  return runSyncedWrite((db) => ensureVapid(db).publicKey);
}

export async function savePushSubscription(sub: Omit<PushSubscriptionRecord, "createdAt">) {
  const count = await runSyncedWrite((db) => {
    ensureVapid(db);
    const list = db.pushSubscriptions ?? [];
    const idx = list.findIndex((item) => item.endpoint === sub.endpoint);
    const existing = idx >= 0 ? list[idx] : undefined;
    const next: PushSubscriptionRecord = {
      endpoint: sub.endpoint,
      keys: { ...sub.keys },
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      ...(sub.topics !== undefined
        ? { topics: [...sub.topics] }
        : existing?.topics !== undefined
          ? { topics: [...existing.topics] }
          : {}),
    };
    if (idx >= 0) list[idx] = next;
    else {
      if (list.length >= 8000) list.shift();
      list.push(next);
    }
    db.pushSubscriptions = list;
    db.updatedAt = new Date().toISOString();
    return list.length;
  });
  const list = mem?.pushSubscriptions ?? [];
  await writePushSubsBlob(list);
  return count;
}

export async function isPushEndpointRegistered(endpoint: string) {
  const db = await loadDb(true);
  return (db.pushSubscriptions ?? []).some((item) => item.endpoint === endpoint);
}

export async function countPushSubscriptions() {
  const db = await loadDb(true);
  return db.pushSubscriptions?.length ?? 0;
}

export async function sendPushTestToEndpoint(endpoint: string) {
  const db = await loadDb(true);
  const sub = (db.pushSubscriptions ?? []).find((item) => item.endpoint === endpoint);
  if (!sub) {
    return {
      registered: false as const,
      total: db.pushSubscriptions?.length ?? 0,
    };
  }
  const vapid = ensureVapid(db);
  const payload = sanitizePushPayload({
    title: "בדיקת התראות",
    body: "אם אתם רואים את זה — ההתראות עובדות!",
    url: "/",
  });
  const { dead, delivered, errors } = await sendPushToSubscriptions({
    vapid,
    subscriptions: [sub],
    payload,
  });
  if (dead.length > 0) {
    const deadSet = new Set(dead);
    await runSyncedWrite((inner) => {
      inner.pushSubscriptions = (inner.pushSubscriptions ?? []).filter(
        (item) => !deadSet.has(item.endpoint),
      );
      inner.updatedAt = new Date().toISOString();
    });
    await writePushSubsBlob(mem?.pushSubscriptions ?? []);
  }
  return {
    registered: true as const,
    delivered: delivered > 0,
    errors,
    total: db.pushSubscriptions?.length ?? 0,
  };
}

export async function removePushSubscription(endpoint: string) {
  const count = await runSyncedWrite((db) => {
    db.pushSubscriptions = (db.pushSubscriptions ?? []).filter((item) => item.endpoint !== endpoint);
    db.updatedAt = new Date().toISOString();
    return db.pushSubscriptions.length;
  });
  await writePushSubsBlob(mem?.pushSubscriptions ?? []);
  return count;
}

export async function broadcastPush(
  payload: PushPayload,
  includeEndpoint?: string,
  options?: { allSubscriptions?: boolean },
) {
  const { vapid, subscriptions } = await runSyncedWrite((db) => {
    const vapid = ensureVapid(db);
    return {
      vapid,
      subscriptions: (db.pushSubscriptions ?? []).filter(
        (item) =>
          options?.allSubscriptions ||
          subscriptionAllowsTopic(item, payload.topic) ||
          (includeEndpoint !== undefined && item.endpoint === includeEndpoint),
      ),
    };
  });
  const { dead, delivered, errors } = await sendPushToSubscriptions({ vapid, subscriptions, payload });
  if (dead.length > 0) {
    const deadSet = new Set(dead);
    await runSyncedWrite((db) => {
      db.pushSubscriptions = (db.pushSubscriptions ?? []).filter((item) => !deadSet.has(item.endpoint));
    });
    await writePushSubsBlob(mem?.pushSubscriptions ?? []);
  }
  return {
    sent: delivered,
    failed: dead.length + errors,
    attempted: subscriptions.length,
    errors,
  };
}
