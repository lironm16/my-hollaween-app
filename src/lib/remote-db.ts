import { gunzipSync, gzipSync } from "node:zlib";
import { cloneDb, mergeHouses } from "@/lib/catalog-sync";
import type { DbFile, House } from "@/lib/types";

const RESTFUL_OBJECTS = "https://api.restful-api.dev/objects";

/** restful-api.dev returns 500 if the JSON body is ~1000+ bytes. */
const CHUNK_CHARS = 820;
const TIMEOUT_MS = 12_000;
const FAIL_COOLDOWN_MS = 60 * 1000;

let remoteCoolUntil = 0;
let remoteChain: Promise<unknown> = Promise.resolve();

export function remoteHealthy() {
  return Date.now() >= remoteCoolUntil;
}

export function rememberRemoteOk() {
  remoteCoolUntil = 0;
}

export function rememberRemoteError(error: unknown) {
  void error;
  remoteCoolUntil = Math.max(remoteCoolUntil, Date.now() + FAIL_COOLDOWN_MS);
}

function withRemoteQueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = remoteChain.then(fn, fn);
  remoteChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(res: Response, attempt: number) {
  const raw = res.headers.get("retry-after");
  const seconds = raw ? Number(raw) : NaN;
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 15_000);
  return Math.min(400 * 2 ** attempt, 8_000);
}

function isBusy(status: number, text: string) {
  return (
    status === 429 ||
    status === 503 ||
    /exceeded allowed number of requests|quota|rate.?limit|too many requests/i.test(text)
  );
}

export type RemoteIndex = {
  v: 1;
  oids: string[];
  updatedAt: string;
  rev: number;
};

export type RemoteSnapshot = {
  db: DbFile;
  index: RemoteIndex;
};

export function remoteDbUrl(): string | null {
  const raw = process.env.HOUSE_DB_URL?.trim();
  if (!raw || raw === "file" || raw === "local") return null;
  return raw;
}

export function usesRemoteDb() {
  return remoteDbUrl() !== null;
}

export function usesCollectionStore(url = remoteDbUrl()) {
  if (!url) return false;
  return url.includes("crudcrud.com") || /\/houses\/?$/.test(url);
}

function headers(extra?: HeadersInit): HeadersInit {
  return {
    Accept: "application/json",
    "User-Agent": "bshchona-halloween/1.0",
    ...extra,
  };
}

async function request(url: string, init?: RequestInit) {
  return withRemoteQueue(async () => {
    let last: Response | null = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const res = await fetch(url, {
        ...init,
        cache: "no-store",
        headers: headers(init?.headers),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      last = res;
      if (res.ok || res.status === 404) return res;
      const text = await res.clone().text().catch(() => "");
      if (!isBusy(res.status, text)) return res;
      await sleep(retryDelayMs(res, attempt));
    }
    return last as Response;
  });
}

async function assertOk(res: Response) {
  if (res.ok) return;
  throw new Error("STORE_UNAVAILABLE");
}

function latestUpdatedAt(houses: House[]) {
  return houses.reduce((max, house) => (house.updatedAt > max ? house.updatedAt : max), houses[0]?.updatedAt ?? new Date().toISOString());
}

function fromRemoteHouse(row: House & { _id?: string }): House {
  const { _id, ...rest } = row;
  return { ...rest, storeId: _id || rest.storeId };
}

function toRemoteHouse(house: House) {
  const { storeId: _storeId, ...rest } = house;
  void _storeId;
  return rest;
}

async function fetchCollection(url: string): Promise<DbFile | null> {
  const res = await request(url);
  if (res.status === 404) return null;
  await assertOk(res);
  const rows: unknown = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const houses = (rows as Array<House & { _id?: string }>).map(fromRemoteHouse);
  return { houses, updatedAt: latestUpdatedAt(houses) };
}

async function postHouse(url: string, house: House): Promise<string> {
  const res = await request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toRemoteHouse(house)),
  });
  await assertOk(res);
  const created = (await res.json()) as { _id?: string };
  if (!created._id) throw new Error("STORE_UNAVAILABLE");
  return created._id;
}

async function putHouse(url: string, storeId: string, house: House) {
  const res = await request(`${url.replace(/\/$/, "")}/${storeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toRemoteHouse(house)),
  });
  await assertOk(res);
}

function changed(a: House, b: House) {
  return a.updatedAt !== b.updatedAt;
}

async function commitCollection(url: string, previous: House[], next: House[]) {
  const prevById = new Map(previous.map((house) => [house.id, house]));
  for (const house of next) {
    const before = prevById.get(house.id);
    if (!before) {
      house.storeId = await postHouse(url, house);
      continue;
    }
    if (!changed(before, house)) continue;
    const storeId = house.storeId || before.storeId;
    if (!storeId) {
      house.storeId = await postHouse(url, house);
      continue;
    }
    await putHouse(url, storeId, house);
    house.storeId = storeId;
  }
}

export async function fetchRemoteSnapshot(indexUrl: string): Promise<RemoteSnapshot | null> {
  if (usesCollectionStore(indexUrl)) {
    const db = await fetchCollection(indexUrl);
    if (!db) return null;
    return {
      db,
      index: { v: 1, oids: [], rev: 0, updatedAt: db.updatedAt },
    };
  }
  return fetchChunkSnapshot(indexUrl);
}

export async function fetchRemoteDb(indexUrl: string): Promise<DbFile | null> {
  const snap = await fetchRemoteSnapshot(indexUrl);
  return snap?.db ?? null;
}

export async function persistRemote(url: string, previous: DbFile | null, next: DbFile): Promise<boolean> {
  if (usesCollectionStore(url)) {
    await commitCollection(url, previous?.houses ?? [], next.houses);
    return true;
  }
  const expectedRev = 0;
  return commitChunked(url, next, expectedRev);
}

export async function putRemoteDb(indexUrl: string, db: DbFile): Promise<void> {
  const snap = await fetchRemoteSnapshot(indexUrl).catch(() => null);
  const merged = snap
    ? { houses: mergeHouses(snap.db.houses, db.houses), updatedAt: db.updatedAt }
    : cloneDb(db);
  const ok = await persistRemote(indexUrl, snap?.db ?? null, merged);
  if (!ok) throw new Error("STORE_UNAVAILABLE");
}

export async function acquireRemoteLock(_owner: string) {
  // Collection writes are per-house; a global lock would serialize the neighborhood for no gain.
}

export async function releaseRemoteLock(_owner: string) {}

export async function commitRemoteDb(indexUrl: string, db: DbFile, expectedRev: number): Promise<boolean> {
  if (usesCollectionStore(indexUrl)) {
    await persistRemote(indexUrl, null, db);
    return true;
  }
  return commitChunked(indexUrl, db, expectedRev);
}

function pack(db: DbFile): string[] {
  const b64 = gzipSync(Buffer.from(JSON.stringify(db)), { level: 9 }).toString("base64");
  const parts: string[] = [];
  for (let i = 0; i < b64.length; i += CHUNK_CHARS) {
    parts.push(b64.slice(i, i + CHUNK_CHARS));
  }
  return parts.length ? parts : [""];
}

function unpack(parts: string[]): DbFile {
  const buf = gunzipSync(Buffer.from(parts.join(""), "base64"));
  const db = JSON.parse(buf.toString("utf8")) as DbFile;
  if (!Array.isArray(db.houses)) throw new Error("STORE_UNAVAILABLE");
  return db;
}

function asIndex(payload: unknown): RemoteIndex | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const inner =
    obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)
      ? (obj.data as Record<string, unknown>)
      : obj;
  if (inner.v !== 1 || !Array.isArray(inner.oids)) return null;
  const oids = inner.oids.filter((id): id is string => typeof id === "string" && id.length > 0);
  const rev = typeof inner.rev === "number" && Number.isFinite(inner.rev) ? inner.rev : 0;
  return {
    v: 1,
    oids,
    rev,
    updatedAt: typeof inner.updatedAt === "string" ? inner.updatedAt : new Date().toISOString(),
  };
}

async function fetchChunkSnapshot(indexUrl: string): Promise<RemoteSnapshot | null> {
  const res = await request(indexUrl);
  if (res.status === 404) return null;
  await assertOk(res);
  const index = asIndex(await res.json());
  if (!index || index.oids.length === 0) return null;
  const parts = await Promise.all(
    index.oids.map(async (oid) => {
      const chunk = await request(`${RESTFUL_OBJECTS}/${oid}`);
      await assertOk(chunk);
      const json = (await chunk.json()) as { data?: { p?: string }; p?: string };
      const part = json.data?.p ?? json.p;
      if (typeof part !== "string") throw new Error("STORE_UNAVAILABLE");
      return part;
    }),
  );
  const db = unpack(parts);
  return { db: { ...db, updatedAt: db.updatedAt || index.updatedAt }, index };
}

async function commitChunked(indexUrl: string, db: DbFile, expectedRev: number): Promise<boolean> {
  const parts = pack(db);
  const oids: string[] = [];
  for (const part of parts) {
    const res = await request(RESTFUL_OBJECTS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "hw-chunk", data: { p: part } }),
    });
    await assertOk(res);
    const json = (await res.json()) as { id?: string };
    if (!json.id) throw new Error("STORE_UNAVAILABLE");
    oids.push(json.id);
  }
  const nextRev = expectedRev + 1;
  const indexBody = JSON.stringify({
    name: "halloween-neighborhood-db",
    data: { v: 1, oids, rev: nextRev, updatedAt: db.updatedAt } satisfies RemoteIndex,
  });
  const res = await request(indexUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: indexBody,
  });
  await assertOk(res);
  return true;
}
