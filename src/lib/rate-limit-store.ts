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
  memoryLoadedAt = now;
  return { ...memoryBuckets };
}

async function saveBuckets(buckets: Buckets) {
  memoryBuckets = buckets;
  memoryLoadedAt = Date.now();
}

/** Per-instance rate limiter — avoids Blob ops that burned through Hobby quota. */
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
