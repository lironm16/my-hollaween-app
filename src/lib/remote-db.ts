import { gunzipSync, gzipSync } from "node:zlib";
import type { DbFile } from "@/lib/types";

/** Small index document. House data lives in gzip chunks under this size limit. */
const DEFAULT_INDEX_URL =
  "https://api.restful-api.dev/objects/ff808181a061cdc401a061d8f6ea0020";
const DEFAULT_COLLECTION_URL = "https://api.restful-api.dev/objects";

/** restful-api.dev returns 500 if the JSON body is ~1000+ bytes. */
const CHUNK_CHARS = 820;
const TIMEOUT_MS = 12_000;

type IndexData = {
  v: 1;
  oids: string[];
  updatedAt: string;
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

function headers(extra?: HeadersInit): HeadersInit {
  return {
    Accept: "application/json",
    "User-Agent": "bshchona-halloween/1.0",
    ...extra,
  };
}

async function request(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: headers(init?.headers),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return res;
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

function asIndex(payload: unknown): IndexData | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const inner =
    obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)
      ? (obj.data as Record<string, unknown>)
      : obj;
  if (inner.v !== 1 || !Array.isArray(inner.oids)) return null;
  const oids = inner.oids.filter((id): id is string => typeof id === "string" && id.length > 0);
  return {
    v: 1,
    oids,
    updatedAt: typeof inner.updatedAt === "string" ? inner.updatedAt : new Date().toISOString(),
  };
}

function objectUrl(collection: string, id: string) {
  return `${collection.replace(/\/$/, "")}/${id}`;
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

async function writeChunk(
  collection: string,
  part: string,
  existingId?: string,
): Promise<string> {
  const body = JSON.stringify({
    name: "hw-chunk",
    data: { p: part },
  });
  if (existingId) {
    const res = await request(objectUrl(collection, existingId), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) throw new Error("STORE_UNAVAILABLE");
    return existingId;
  }
  const res = await request(collection, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!res.ok) throw new Error("STORE_UNAVAILABLE");
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new Error("STORE_UNAVAILABLE");
  return json.id;
}

export async function fetchRemoteDb(indexUrl: string): Promise<DbFile | null> {
  const res = await request(indexUrl);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("STORE_UNAVAILABLE");
  const json: unknown = await res.json();
  const index = asIndex(json);
  if (!index || index.oids.length === 0) return null;
  const collection = collectionUrl(indexUrl);
  const parts = await Promise.all(index.oids.map((oid) => readChunk(collection, oid)));
  const db = unpack(parts);
  return { ...db, updatedAt: db.updatedAt || index.updatedAt };
}

export async function putRemoteDb(indexUrl: string, db: DbFile): Promise<void> {
  const collection = collectionUrl(indexUrl);
  const parts = pack(db);
  let existing: string[] = [];
  try {
    const current = await request(indexUrl);
    if (current.ok) {
      const index = asIndex(await current.json());
      existing = index?.oids ?? [];
    }
  } catch {
    existing = [];
  }
  const oids: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    oids.push(await writeChunk(collection, parts[i], existing[i]));
  }
  const indexBody = JSON.stringify({
    name: "halloween-neighborhood-db",
    data: { v: 1, oids, updatedAt: db.updatedAt } satisfies IndexData,
  });
  const res = await request(indexUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: indexBody,
  });
  if (!res.ok) throw new Error("STORE_UNAVAILABLE");
}
