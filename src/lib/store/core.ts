import { promises as fs } from "node:fs";
import path from "node:path";
import { get as getBlob, put as putBlob } from "@vercel/blob";
import { canonicalHouseId } from "@/lib/ids";
import { normalizeAddressFields } from "@/lib/address-fields";
import {
  effectiveVisit,
  normalizeTreats,
  syncDecorFields,
} from "@/lib/house-state";
import { houseHoursWindows, syncHoursFields } from "@/lib/hours";
import { cloneDb, mergeHouses, mergePushSubscriptions } from "@/lib/catalog-sync";
import { isStubHouse } from "@/lib/house-set";
import {
  changedRehearsalStubs,
  readRehearsalStubOverlays,
  writeRehearsalStubOverlays,
} from "@/lib/rehearsal-stub-overlays";
import {
  housesForIsolatedTestDb,
  loadStaticRehearsalStubRows,
  stripStubHouses,
} from "@/lib/rehearsal-stubs";
import {
  HOUSE_THEMES,
  POI_CATEGORIES,
  type DbFile,
  type House,
  type HouseTheme,
  type PoiCategory,
  type PushSubscriptionRecord,
} from "@/lib/types";
import { migratePushSettings } from "@/lib/push-templates";
import {
  blobConfigured,
  privateBlobGetOptions,
  privateBlobPutAttempts,
  privateBlobPutOptions,
} from "@/lib/blob-auth";
import {
  catalogSnapshotToDb,
  publishCatalogSnapshot,
  readSharedCatalogSnapshot,
} from "@/lib/catalog-cache";
import {
  bumpCatalogMeta,
  firestoreConfigured,
  readCatalogMeta,
  readFirestoreCatalog,
  readFirestorePushData,
  writeFirestoreDb,
  writeFirestorePushSettings,
} from "@/lib/firestore-db";
import {
  isRetryableBlobError,
  productionRequiresBlob,
  storageErrorCodeFromBlob,
  storageErrorFromCode,
} from "@/lib/storage-errors";

const SEED_PATH = path.join(process.cwd(), "data", "seed.json");
const BLOB_PATH = "halloween-houses/db.json";
const PUSH_BLOB_PATH = "halloween-houses/push-settings.json";
const PUSH_SUBS_BLOB_PATH = "halloween-houses/push-subscriptions.json";
/** Cache house db reads — each miss fans out to several Blob GETs. */
const MEM_TTL_MS = 600_000;
const PUSH_MEM_TTL_MS = 600_000;

let pushMemAt = 0;

let chain: Promise<unknown> = Promise.resolve();

export function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

type GlobalBag = { __hwHouseDb?: DbFile };

export function stamp(value: { updatedAt: string }) {
  const n = Date.parse(value.updatedAt);
  return Number.isFinite(n) ? n : 0;
}

function catalogHousesChanged(prev: House[], next: House[]) {
  const before = stripStubHouses(prev);
  const after = stripStubHouses(next);
  if (before.length !== after.length) return true;
  const map = new Map(before.map((house) => [canonicalHouseId(house.id), house.updatedAt]));
  const nextIds = new Set(after.map((house) => canonicalHouseId(house.id)));
  for (const id of map.keys()) {
    if (!nextIds.has(id)) return true;
  }
  for (const house of after) {
    const id = canonicalHouseId(house.id);
    if (map.get(id) !== house.updatedAt) return true;
  }
  return false;
}

export function getGlobalDb(): DbFile | null {
  const db = (globalThis as GlobalBag).__hwHouseDb;
  return db ? cloneDb(db) : null;
}

export function setGlobalDb(db: DbFile) {
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

export function normalizeHouse(house: House & { status?: string; rejectionReason?: string }): House {
  const { status: _status, rejectionReason: _reason, ...base } = house;
  const theme = HOUSE_THEMES.includes(base.theme as HouseTheme)
    ? (base.theme as HouseTheme)
    : "pumpkin";
  const visit = effectiveVisit(base);
  const { treats, treatStock } = normalizeTreats(base.treats, base.treatStock);
  const hours = syncHoursFields(houseHoursWindows(base));
  const decor = syncDecorFields(base);
  const addressFields = normalizeAddressFields(base);
  const kind = base.kind === "poi" ? "poi" : "house";
  const poiCategory =
    kind === "poi" && base.poiCategory && POI_CATEGORIES.includes(base.poiCategory as PoiCategory)
      ? (base.poiCategory as PoiCategory)
      : kind === "poi"
        ? "other"
        : null;
  return {
    ...base,
    kind,
    poiCategory,
    address: addressFields.address,
    neighborhood: addressFields.neighborhood,
    theme,
    arrival: base.arrival ?? "",
    accessible: Boolean(base.accessible),
    decorLevel: decor.decorLevel,
    decorated: decor.decorated,
    treats,
    visit,
    treatStock,
    soldOut: visit === "closed",
    adminFrozen: Boolean(base.adminFrozen),
    ownerFrozenUntil: base.ownerFrozenUntil ?? null,
    photoUrl: base.photoUrl ?? "",
    openHours: hours.openHours,
    openFrom: hours.openFrom,
    openTo: hours.openTo,
    openFrom2: hours.openFrom2,
    openTo2: hours.openTo2,
  };
}

export function normalizeDb(db: DbFile): DbFile {
  return {
    ...db,
    houses: db.houses.filter((house) => house.id !== "בית-9316").map(normalizeHouse),
    pushSubscriptions: Array.isArray(db.pushSubscriptions) ? db.pushSubscriptions : [],
    vapid: db.vapid?.publicKey && db.vapid?.privateKey ? db.vapid : undefined,
    pushSettings: db.pushSettings?.templates
      ? {
          updatedAt: db.pushSettings.updatedAt,
          ...(db.pushSettings.generation !== undefined ? { generation: db.pushSettings.generation } : {}),
          templates: { ...db.pushSettings.templates },
        }
      : undefined,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readBlobDb(): Promise<DbFile | null> {
  if (!blobConfigured()) return null;
  try {
    const result = await getBlob(BLOB_PATH, privateBlobGetOptions());
    if (!result?.stream) return null;
    const text = await new Response(result.stream).text();
    return normalizeDb(JSON.parse(text) as DbFile);
  } catch {
    return null;
  }
}

async function writeBlobDb(db: DbFile) {
  if (!blobConfigured()) {
    throw storageErrorFromCode("BLOB_NOT_CONFIGURED");
  }
  const payload = JSON.stringify(db);
  let lastError: unknown;
  for (const putOptions of privateBlobPutAttempts("application/json")) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await putBlob(BLOB_PATH, payload, putOptions);
        return;
      } catch (error) {
        lastError = error;
        console.error("[store] blob write failed", {
          auth: putOptions.token ? "token" : putOptions.storeId ? "oidc" : "auto",
          attempt: attempt + 1,
          name: error instanceof Error ? error.name : "unknown",
          message: error instanceof Error ? error.message : String(error),
        });
        if (!isRetryableBlobError(error) || attempt === 2) break;
        await sleep(300 * (attempt + 1));
      }
    }
  }
  throw storageErrorFromCode(storageErrorCodeFromBlob(lastError), lastError);
}

async function readPushSettingsBlob(): Promise<DbFile["pushSettings"] | null> {
  if (!blobConfigured()) return null;
  try {
    const result = await getBlob(PUSH_BLOB_PATH, privateBlobGetOptions());
    if (!result?.stream) return null;
    const parsed = JSON.parse(await new Response(result.stream).text()) as DbFile["pushSettings"];
    if (!parsed?.templates) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writePushSettingsBlob(settings: DbFile["pushSettings"]) {
  if (!blobConfigured() || !settings?.templates) return;
  try {
    await putBlob(PUSH_BLOB_PATH, JSON.stringify(settings), privateBlobPutOptions("application/json"));
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

async function readPushSubsBlob(): Promise<PushSubscriptionRecord[]> {
  const [local, remote] = await Promise.all([
    readLocalPushSubsBlob(),
    blobConfigured()
      ? getBlob(PUSH_SUBS_BLOB_PATH, privateBlobGetOptions())
          .then(async (result) => {
            if (!result?.stream) return undefined;
            const parsed = JSON.parse(await new Response(result.stream).text()) as {
              subscriptions?: PushSubscriptionRecord[];
            };
            return Array.isArray(parsed.subscriptions) ? parsed.subscriptions : undefined;
          })
          .catch(() => undefined)
      : Promise.resolve(undefined),
  ]);
  return mergePushSubscriptions(local ?? undefined, remote);
}

export async function writePushSubsBlob(subscriptions: PushSubscriptionRecord[]) {
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
  if (!blobConfigured()) return;
  try {
    await putBlob(PUSH_SUBS_BLOB_PATH, payload, privateBlobPutOptions("application/json"));
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

export function pushSettingsStamp(settings?: DbFile["pushSettings"] | null) {
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

export async function readFileDb(): Promise<DbFile> {
  if (firestoreConfigured()) {
    const global = getGlobalDb();
    const meta = await readCatalogMeta();
    const shared = await readSharedCatalogSnapshot(meta?.updatedAt);
    let remote: DbFile | null = shared ? catalogSnapshotToDb(shared) : null;
    if (!remote) {
      const catalog = await readFirestoreCatalog();
      if (catalog) {
        remote = {
          ...catalog,
          pushSubscriptions: mem?.pushSubscriptions ?? global?.pushSubscriptions ?? [],
          ...(mem?.vapid ? { vapid: mem.vapid } : global?.vapid ? { vapid: global.vapid } : {}),
        };
      }
    }
    if (remote) {
      const merged = pickNewest(remote, global) ?? remote;
      foldPushSubscriptions(merged, mem, global);
      return withStaticRehearsalStubs(merged);
    }
    const blob = await readBlobDb();
    const seed = normalizeDb(blob ?? (await readSeed()));
    const realSeed = { ...seed, houses: stripStubHouses(seed.houses) };
    try {
      await writeFirestoreDb({ db: realSeed, prev: null });
    } catch (error) {
      console.error("[store] firestore bootstrap failed", error);
    }
    return withStaticRehearsalStubs(realSeed);
  }
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
    return withStaticRehearsalStubs(merged);
  }
  const seed = normalizeDb(await readSeed());
  const seedForDisk = process.env.DATA_DIR
    ? { ...seed, houses: housesForIsolatedTestDb(seed.houses) }
    : { ...seed, houses: stripStubHouses(seed.houses) };
  try {
    await writeFileDb(seedForDisk);
  } catch {
    /* /tmp may still work later */
  }
  if (!process.env.DATA_DIR) {
    void writeBlobDb({ ...seed, houses: stripStubHouses(seed.houses) }).catch(() => undefined);
  }
  return withStaticRehearsalStubs(seedForDisk);
}

let mem: DbFile | null = null;
let memAt = 0;

type RemovalTombstone = { id: string; deletedAt: string };
const REMOVAL_MEM_MAX = 200;
let recentRemovals: RemovalTombstone[] = [];

export function isMemWarm() {
  return Boolean(mem && Date.now() - memAt < MEM_TTL_MS);
}

/** Tombstone deletes on this instance so warm delta polls skip Firestore. */
export function registerCatalogRemoval(id: string, deletedAt = new Date().toISOString()) {
  const docId = canonicalHouseId(id);
  if (!docId) return;
  recentRemovals = [
    { id: docId, deletedAt },
    ...recentRemovals.filter((entry) => entry.id !== docId),
  ].slice(0, REMOVAL_MEM_MAX);
}

function syncRemovalMem(prev: DbFile, db: DbFile) {
  const nextIds = new Set(db.houses.map((house) => canonicalHouseId(house.id)));
  for (const house of prev.houses) {
    const id = canonicalHouseId(house.id);
    if (id && !nextIds.has(id)) registerCatalogRemoval(id, db.updatedAt);
  }
}

export function catalogRemovalsSince(sinceMs: number) {
  return recentRemovals
    .filter((entry) => stamp({ updatedAt: entry.deletedAt }) > sinceMs)
    .map((entry) => entry.id);
}

let onMemSetHook: (() => void) | null = null;
export function registerOnMemSetHook(fn: () => void) {
  onMemSetHook = fn;
}

export function setMem(db: DbFile) {
  mem = db;
  memAt = Date.now();
  onMemSetHook?.();
  setGlobalDb(db);
}

async function persistPushSettings(
  settings: DbFile["pushSettings"],
  existingStamp: number,
) {
  if (!settings?.templates) return;
  if (pushSettingsStamp(settings) < existingStamp) return;
  if (firestoreConfigured()) {
    await writeFirestorePushSettings(settings);
    return;
  }
  await writePushSettingsBlob(settings);
}

export async function writeDurableDb(db: DbFile, prev?: DbFile | null) {
  if (firestoreConfigured()) {
    await writeFirestoreDb({ db, prev });
    return;
  }
  if (blobConfigured()) {
    await writeBlobDb(db);
    try {
      await writeFileDb(db);
    } catch {
      /* Vercel Blob is the durable source of truth in production */
    }
    return;
  }
  if (productionRequiresBlob() && !process.env.DATA_DIR?.trim()) {
    throw storageErrorFromCode("BLOB_NOT_CONFIGURED");
  }
  try {
    await writeFileDb(db);
  } catch (error) {
    console.error("[store] local db write failed", error);
    throw storageErrorFromCode("PERSIST_FAILED", error);
  }
}

export async function persistDb(db: DbFile, prev?: DbFile | null) {
  if (prev) syncRemovalMem(prev, db);
  const cachedPush = pickPushSettings(db, mem, getGlobalDb());
  const pushBlob = cachedPush?.templates ? null : await readPushSettingsBlob();
  const blobWrapper = asPushCandidate(cachedPush ?? pushBlob);
  const blobStamp = pushSettingsStamp(cachedPush ?? pushBlob);
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
        await writeDurableDb(live, mem);
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
        await writeDurableDb(live, mem);
      } catch {
        /* memory still holds the merged houses */
      }
      setMem(live);
    }
    return;
  }

  const housesChanged = catalogHousesChanged(prev?.houses ?? [], db.houses);
  const stubChanges = changedRehearsalStubs(prev, db);

  await writeDurableDb(db, prev);

  if (stubChanges.length > 0) {
    try {
      await writeRehearsalStubOverlays(stubChanges);
      await bumpCatalogMeta(db.updatedAt);
    } catch (error) {
      console.error("[store] rehearsal stub overlay write failed", error);
    }
  }

  if (housesChanged) {
    void publishCatalogSnapshot(db).catch((error) => {
      console.error("[store] catalog snapshot publish failed", error);
    });
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

async function withStaticRehearsalStubs(db: DbFile): Promise<DbFile> {
  if (process.env.DATA_DIR?.trim()) return db;
  const [rows, overlays] = await Promise.all([
    loadStaticRehearsalStubRows(),
    readRehearsalStubOverlays(),
  ]);
  const stubs = rows.map((row) => normalizeHouse(row as House & { status?: string }));
  const real = stripStubHouses(db.houses).map(normalizeHouse);
  const byId = new Map(real.map((house) => [house.id, house]));
  for (const stub of stubs) byId.set(stub.id, stub);
  for (const [id, overlay] of overlays) {
    if (isStubHouse(overlay)) byId.set(id, normalizeHouse(overlay));
  }
  for (const house of db.houses) {
    if (!isStubHouse(house)) continue;
    const existing = byId.get(house.id);
    if (!existing || stamp(house) > stamp(existing)) byId.set(house.id, normalizeHouse(house));
  }
  return { ...db, houses: [...byId.values()] };
}

export async function loadDb(fresh = false): Promise<DbFile> {
  // Warm mem can lag Firestore rehearsal overlays — always re-merge stubs before serving.
  if (!fresh && mem && Date.now() - memAt < MEM_TTL_MS) return withStaticRehearsalStubs(mem);
  return withLock(async () => {
    if (!fresh && mem && Date.now() - memAt < MEM_TTL_MS) return withStaticRehearsalStubs(mem);
    const db = await readFileDb();
    const global = getGlobalDb();
    const chosen = pickNewest(db, global) ?? db;
    foldPushSubscriptions(chosen, mem, global);
    const merged = await withStaticRehearsalStubs(chosen);
    setMem(merged);
    return merged;
  });
}

/** Push-only data — subscriptions + vapid, without reloading the house catalog (#2). */
export async function loadPushData(): Promise<DbFile> {
  const hasPushMem =
    mem &&
    Array.isArray(mem.pushSubscriptions) &&
    mem.vapid?.publicKey &&
    mem.vapid.privateKey &&
    Date.now() - pushMemAt < PUSH_MEM_TTL_MS;
  if (hasPushMem) return mem!;

  return withLock(async () => {
    if (
      mem &&
      Array.isArray(mem.pushSubscriptions) &&
      mem.vapid?.publicKey &&
      mem.vapid.privateKey &&
      Date.now() - pushMemAt < PUSH_MEM_TTL_MS
    ) {
      return mem;
    }

    const base = mem ?? (await loadDb());
    if (firestoreConfigured()) {
      const push = await readFirestorePushData();
      if (push) {
        base.pushSubscriptions = push.pushSubscriptions;
        if (push.vapid) base.vapid = push.vapid;
        foldPushSettings(base, asPushCandidate(push.pushSettings));
      }
    }
    pushMemAt = Date.now();
    setMem(base);
    setGlobalDb(base);
    return base;
  });
}

export async function prepareDbFromSources(): Promise<DbFile> {
  if (firestoreConfigured() && mem && Date.now() - memAt < MEM_TTL_MS) {
    const db = normalizeDb(cloneDb(mem));
    const keptPush = db.pushSettings;
    const global = getGlobalDb();
    foldPushSettings(db, asPushCandidate(keptPush), global);
    foldPushSubscriptions(db, global);
    return db;
  }
  const db = normalizeDb(cloneDb(await readFileDb()));
  const keptPush = db.pushSettings;
  const global = getGlobalDb();
  if (global && stamp(global) > stamp(db)) {
    Object.assign(db, normalizeDb(cloneDb(global)));
  }
  foldPushSettings(db, asPushCandidate(keptPush), mem, global);
  foldPushSubscriptions(db, mem, global);
  return db;
}

export async function runSyncedWrite<T>(fn: (db: DbFile) => T | Promise<T>): Promise<T> {
  return withLock(async () => {
    const db = await prepareDbFromSources();
    const prev = mem ? cloneDb(mem) : null;
    const result = await fn(db);
    await persistDb(db, prev);
    return result;
  });
}


let pushSettingsGenerationChecked = false;

export function isPushSettingsGenerationChecked() {
  return pushSettingsGenerationChecked;
}

export function setPushSettingsGenerationChecked(value: boolean) {
  pushSettingsGenerationChecked = value;
}

export async function persistPushSettingsMigration(db: DbFile) {
  setMem(db);
  setGlobalDb(db);
  try {
    await writePushSettingsBlob(db.pushSettings);
  } catch {
    /* house db still holds a copy */
  }
  try {
    if (blobConfigured()) await writeBlobDb(db);
    await writeFileDb(db);
  } catch {
    /* memory still holds migrated templates */
  }
}

export async function ensurePushSettingsGeneration() {
  if (pushSettingsGenerationChecked) return;
  await withLock(async () => {
    if (pushSettingsGenerationChecked) return;
    const db = normalizeDb(cloneDb(await readFileDb()));
    foldPushSettings(db, mem, getGlobalDb());
    const { settings, changed } = migratePushSettings(db.pushSettings);
    if (!changed) {
      pushSettingsGenerationChecked = true;
      return;
    }
    db.pushSettings = settings;
    db.updatedAt = new Date().toISOString();
    await persistPushSettingsMigration(db);
    pushSettingsGenerationChecked = true;
  });
}

export function getMem(): DbFile | null {
  return mem;
}

export function getPushMemAt(): number {
  return pushMemAt;
}

export function setPushMemAt(value: number) {
  pushMemAt = value;
}

export function setMemPushSubscriptions(list: PushSubscriptionRecord[]) {
  if (mem) mem.pushSubscriptions = list;
}
