import type { PutCommandOptions } from "@vercel/blob";

/** Shared Vercel Blob auth — try OIDC on Vercel, then env read-write token. */

function blobStoreId() {
  const fromEnv = process.env.BLOB_STORE_ID?.trim();
  if (fromEnv) return fromEnv.replace(/^store_/, "");
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return undefined;
  const storeId = token.split("_")[3];
  return storeId || undefined;
}

export function blobConfigured() {
  return Boolean(blobStoreId() || process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function blobStoreOptions() {
  const storeId = blobStoreId();
  return storeId ? { storeId } : {};
}

export function privateBlobGetOptions() {
  return {
    access: "private" as const,
    useCache: false,
    ...blobStoreOptions(),
  };
}

type PutExtra = {
  addRandomSuffix?: boolean;
  allowOverwrite?: boolean;
  cacheControlMaxAge?: number;
};

function privateBlobPutBase(contentType: string, extra?: PutExtra) {
  return {
    access: "private" as const,
    addRandomSuffix: extra?.addRandomSuffix ?? false,
    allowOverwrite: extra?.allowOverwrite ?? true,
    contentType,
    cacheControlMaxAge: extra?.cacheControlMaxAge ?? 0,
  };
}

/** Try OIDC (storeId) first, then the static read-write token. */
export function privateBlobPutAttempts(contentType: string, extra?: PutExtra): PutCommandOptions[] {
  const base = privateBlobPutBase(contentType, extra);
  const storeId = blobStoreId();
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const attempts: PutCommandOptions[] = [];
  if (storeId) attempts.push({ ...base, storeId });
  if (token) attempts.push({ ...base, token });
  if (attempts.length === 0) attempts.push(base);
  return attempts;
}

export function privateBlobPutOptions(contentType: string, extra?: PutExtra) {
  return privateBlobPutAttempts(contentType, extra)[0]!;
}
