/** Shared Vercel Blob auth — prefer OIDC on Vercel, then env read-write token. */

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

export function privateBlobPutOptions(
  contentType: string,
  extra?: {
    addRandomSuffix?: boolean;
    allowOverwrite?: boolean;
    cacheControlMaxAge?: number;
  },
) {
  return {
    access: "private" as const,
    addRandomSuffix: extra?.addRandomSuffix ?? false,
    allowOverwrite: extra?.allowOverwrite ?? true,
    contentType,
    cacheControlMaxAge: extra?.cacheControlMaxAge ?? 0,
    ...blobStoreOptions(),
  };
}
