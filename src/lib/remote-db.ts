import { gunzipSync, gzipSync } from "node:zlib";
import { cloneDb, mergeHouses } from "@/lib/catalog-sync";
import type { DbFile } from "@/lib/types";

/** Small index document. House data lives in gzip chunks under this size limit. */
const DEFAULT_INDEX_URL =
  "https://api.restful-api.dev/objects/ff808181a061cdc401a061d8f6ea0020";
const DEFAULT_LOCK_URL =
  "https://api.restful-api.dev/objects/ff808181a061cdc401a061e1c0f4005a";
const DEFAULT_COLLECTION_URL = "https://api.restful-api.dev/objects";

/** restful-api.dev returns 500 if the JSON body is ~1000+ bytes. */
const CHUNK_CHARS = 820;
const TIMEOUT_MS = 12_000;
const LOCK_TTL_MS = 8_000;

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
  if (raw === "file" || raw === "local") return null;
  if (raw) return raw;
  return DEFAULT_INDEX_URL;
}

export function usesRemoteDb() {
  return remoteDbUrl() !== null;
}

function collectionUrl(indexUrl: string) {
  return process.env.HOUSE_DB_COLLECTION_URL?.trim() || deriveCollection(indexUrl);
}

function deriveCollection(indexUrl: string) {
  if (indexUrl.includes("restful-api.dev/objects/")) {
    return DEFAULT_COLLECTION_URL;
  }
  return DEFAULT_COLLECTION_URL;
}

function lockUrl() {
  return process.env.HOUSE_DB_LOCK_URL?.trim() || DEFAULT_LOCK_URL;
}

function headers(extra?: HeadersInit): HeadersInit {
  return {
    Accept: "application/json",
    "User-Agent": "bshchona-halloween/1.0",
    ...extra,
  };
}

async function request(url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    cache: "no-store",
    headers: headers(init?.headers),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function objectUrl(collection: string, id: string) {
  return `${collection.replace(/\/$/, "")}/${id}`;
}

function sameOids(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

async function readChunk(collection: string, oid: string): Promise<string> {
  const res = await request(objectUrl(collection, oid));
  if (!res.ok) throw new Error("STORE_UNAVAILABLE");
  const json: unknown = await res.json();
  const obj = json as { data?: { p?: string }; p?: string };
  const part = obj.data?.p ?? obj.p;
  if (typeof part !== "string") throw new Error("STORE_UNAVAILABLE");
  return part;
}

async function postChunk(collection: string, part: string): Promise<string> {
  const res = await request(collection, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "hw-chunk", data: { p: part } }),
  });
  if (!res.ok) throw new Error("STORE_UNAVAILABLE");
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new Error("STORE_UNAVAILABLE");
  return json.id;
}

async function readIndex(indexUrl: string): Promise<RemoteIndex | null> {
  const res = await request(indexUrl);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("STORE_UNAVAILABLE");
  return asIndex(await res.json());
}

export async function fetchRemoteSnapshot(indexUrl: string): Promise<RemoteSnapshot | null> {
  const index = await readIndex(indexUrl);
  if (!index || index.oids.length === 0) return null;
  const collection = collectionUrl(indexUrl);
  const parts = await Promise.all(index.oids.map((oid) => readChunk(collection, oid)));
  const db = unpack(parts);
  return { db: { ...db, updatedAt: db.updatedAt || index.updatedAt }, index };
}

export async function fetchRemoteDb(indexUrl: string): Promise<DbFile | null> {
  const snap = await fetchRemoteSnapshot(indexUrl);
  return snap?.db ?? null;
}

function lockPayload(until: number, owner: string) {
  return JSON.stringify({ name: "hw-lock", data: { until, owner } });
}

async function readLock(): Promise<{ until: number; owner: string }> {
  const res = await request(lockUrl());
  if (!res.ok) return { until: 0, owner: "" };
  const json = (await res.json()) as { data?: { until?: number; owner?: string } };
  return {
    until: Number(json.data?.until) || 0,
    owner: typeof json.data?.owner === "string" ? json.data.owner : "",
  };
}

async function writeLock(until: number, owner: string) {
  const res = await request(lockUrl(), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: lockPayload(until, owner),
  });
  if (!res.ok) throw new Error("STORE_UNAVAILABLE");
}

export async function acquireRemoteLock(owner: string) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const now = Date.now();
    const current = await readLock();
    if (current.until > now && current.owner !== owner) {
      await sleep(Math.min(400, current.until - now + 15));
      continue;
    }
    await writeLock(now + LOCK_TTL_MS, owner);
    await sleep(45);
    const confirm = await readLock();
    if (confirm.owner === owner && confirm.until > Date.now()) return;
    await sleep(40 * 2 ** Math.min(attempt, 4) + Math.floor(Math.random() * 40));
  }
  throw new Error("STORE_UNAVAILABLE");
}

export async function releaseRemoteLock(owner: string) {
  try {
    const current = await readLock();
    if (current.owner === owner) await writeLock(0, "");
  } catch {
    // Lock expires on its own.
  }
}

/**
 * Write a new immutable chunk set, then swing the index pointer.
 * Returns false if another writer moved the index first — caller should merge and retry.
 */
export async function commitRemoteDb(
  indexUrl: string,
  db: DbFile,
  expectedRev: number,
): Promise<boolean> {
  const collection = collectionUrl(indexUrl);
  const parts = pack(db);
  const oids: string[] = [];
  for (const part of parts) {
    oids.push(await postChunk(collection, part));
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
  if (!res.ok) throw new Error("STORE_UNAVAILABLE");
  const confirm = await readIndex(indexUrl);
  return Boolean(confirm && confirm.rev === nextRev && sameOids(confirm.oids, oids));
}

export async function putRemoteDb(indexUrl: string, db: DbFile): Promise<void> {
  const snap = await fetchRemoteSnapshot(indexUrl).catch(() => null);
  const merged = snap
    ? { houses: mergeHouses(snap.db.houses, db.houses), updatedAt: db.updatedAt }
    : cloneDb(db);
  const ok = await commitRemoteDb(indexUrl, merged, snap?.index.rev ?? 0);
  if (!ok) throw new Error("STORE_UNAVAILABLE");
}
