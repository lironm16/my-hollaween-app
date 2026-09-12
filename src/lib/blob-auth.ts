/** Shared Vercel Blob auth — let the SDK pick OIDC on Vercel, then env token. */

export function blobConfigured() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim() || process.env.BLOB_STORE_ID?.trim(),
  );
}

export function privateBlobGetOptions() {
  return {
    access: "private" as const,
    useCache: false,
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
  };
}
