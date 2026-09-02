#!/usr/bin/env node
/**
 * Stress-test the read path that Halloween night depends on.
 * Default: 1000 parallel GETs against /catalog.json (night-of CDN path)
 * and /api/catalog (live catalog, in-memory after first read).
 *
 * Night-of SLO is the static file. The API is a live fallback.
 *
 *   node scripts/stress-test.mjs
 *   BASE_URL=http://127.0.0.1:43127 CONCURRENCY=1000 node scripts/stress-test.mjs
 */

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43127";
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 1000);
const PATHS = (process.env.PATHS ?? "/catalog.json,/api/catalog").split(",");
const P95_LIMIT = {
  "/catalog.json": Number(process.env.STATIC_P95_MS ?? 1500),
  "/api/catalog": Number(process.env.API_P95_MS ?? 3000),
};

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[i];
}

async function hammer(path) {
  const url = `${BASE}${path}`;
  const started = Date.now();
  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      const t0 = performance.now();
      try {
        const res = await fetch(url, { cache: "no-store" });
        const ms = performance.now() - t0;
        const text = await res.text();
        return {
          ok: res.ok,
          status: res.status,
          ms,
          bytes: text.length,
        };
      } catch (error) {
        return {
          ok: false,
          status: 0,
          ms: performance.now() - t0,
          bytes: 0,
          error: error instanceof Error ? error.message : "error",
        };
      }
    }),
  );
  const elapsed = Date.now() - started;
  const times = results.map((r) => r.ms).sort((a, b) => a - b);
  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;
  const bytes = results.reduce((s, r) => s + r.bytes, 0);
  return {
    path,
    concurrency: CONCURRENCY,
    ok,
    fail,
    elapsedMs: elapsed,
    rps: Math.round((results.length / elapsed) * 1000),
    p50: Math.round(percentile(times, 50)),
    p95: Math.round(percentile(times, 95)),
    p99: Math.round(percentile(times, 99)),
    max: Math.round(times[times.length - 1] ?? 0),
    kb: Math.round(bytes / 1024),
    sampleError: results.find((r) => !r.ok)?.error ?? results.find((r) => !r.ok)?.status,
  };
}

const warmup = await fetch(`${BASE}/api/catalog`).catch(() => null);
if (!warmup || !warmup.ok) {
  console.error(`Server is not reachable at ${BASE}. Start it with npm run dev`);
  process.exit(1);
}

console.log(`Stress ${CONCURRENCY} parallel users → ${BASE}`);
const reports = [];
for (const path of PATHS) {
  const report = await hammer(path.trim());
  reports.push(report);
  console.log(JSON.stringify(report, null, 2));
}

const failed = reports.filter((r) => {
  const limit = P95_LIMIT[r.path] ?? 3000;
  return r.fail > r.concurrency * 0.01 || r.p95 > limit;
});
if (failed.length) {
  console.error("Stress test failed: error rate > 1% or p95 over the path budget");
  process.exit(1);
}
console.log("Stress test passed.");
