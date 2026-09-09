import { get as getBlob, put as putBlob } from "@vercel/blob";

const RATE_BLOB_PATH = "halloween-houses/rate-limits.json";
const MEM_TTL_MS = 30_000;

type Buckets = Record<string, number[]>;

let memoryBuckets: Buckets = {};
let memoryLoadedAt = 0;
let chain: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function blobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function pruneBuckets(buckets: Buckets, now: number, maxAgeMs: number) {
  for (const key of Object.keys(buckets)) {
    const recent = buckets[key]!.filter((stamp) => now - stamp < maxAgeMs);
    if (recent.length === 0) delete buckets[key];
    else buckets[key] = recent;
  }
}

async function loadBuckets(): Promise<Buckets> {
  const now = Date.now();
  if (now - memoryLoadedAt < MEM_TTL_MS) {
    return { ...memoryBuckets };
  }
  if (!blobEnabled()) {
    memoryLoadedAt = now;
    return { ...memoryBuckets };
  }
  try {
    const result = await getBlob(RATE_BLOB_PATH, {
      access: "private",
      useCache: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result?.stream) {
      memoryBuckets = {};
    } else {
      const parsed = JSON.parse(await new Response(result.stream).text()) as Buckets;
      memoryBuckets = parsed && typeof parsed === "object" ? parsed : {};
    }
  } catch {
    memoryBuckets = {};
  }
  memoryLoadedAt = now;
  return { ...memoryBuckets };
}

async function saveBuckets(buckets: Buckets) {
  memoryBuckets = buckets;
  memoryLoadedAt = Date.now();
  if (!blobEnabled()) return;
  await putBlob(RATE_BLOB_PATH, JSON.stringify(buckets), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    cacheControlMaxAge: 0,
  });
}

/** Shared rate limiter — uses Vercel Blob when configured, otherwise per-instance memory. */
export async function rateLimitShared(key: string, limit: number, windowMs: number) {
  return withLock(async () => {
    const now = Date.now();
    const buckets = await loadBuckets();
    pruneBuckets(buckets, now, windowMs * 4);
    const recent = (buckets[key] ?? []).filter((stamp) => now - stamp < windowMs);
    if (recent.length >= limit) {
      buckets[key] = recent;
      await saveBuckets(buckets);
      return false;
    }
    recent.push(now);
    buckets[key] = recent;
    await saveBuckets(buckets);
    return true;
  });
}
