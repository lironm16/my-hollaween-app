#!/usr/bin/env node
/**
 * Run browser E2E suites against a live server.
 * If BASE_URL is not reachable, starts `npm run start` (expects `npm run build` first).
 *
 *   npm run build && npm run test:e2e
 *   BASE_URL=http://127.0.0.1:43127 npm run test:e2e   # server already running
 */

import { spawnSync } from "node:child_process";
import {
  createTestServerManager,
  defaultE2eDataDir,
  pickFreePort,
} from "./lib/test-server.mjs";

const E2E_SCRIPTS = [
  "scripts/check-offline-catalog.mjs",
  "scripts/e2e-visitor-flows.mjs",
  "scripts/e2e-batch3.mjs",
  "scripts/e2e-batch4.mjs",
  "scripts/e2e-batch5.mjs",
  "scripts/e2e-batch6.mjs",
  "scripts/e2e-batch7.mjs",
  "scripts/check-sw-precache.mjs",
];
const e2ePort = Number(process.env.E2E_TEST_PORT ?? (await pickFreePort()));
const dataDir = process.env.DATA_DIR ?? defaultE2eDataDir();
const server = createTestServerManager({
  port: e2ePort,
  dataDir,
  label: "e2e",
  forceFresh: true,
  extraEnv: {
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "pumpkin2026",
    NEXT_PUBLIC_PUSH_ALERTS: "1",
    VAPID_PUBLIC_KEY:
      process.env.VAPID_PUBLIC_KEY ??
      "BFv8IZZswPD-n3VbqXoGiQJQ9JsPQN2nouX_eA_JW2IAjZQN22swsxSPS2I3aZQyE_twEof49hKcLs-M2GvfeAs",
    VAPID_PRIVATE_KEY:
      process.env.VAPID_PRIVATE_KEY ?? "HxaioVmvoYivcQ4vz2mCCTQ07m6OnoLZJ-We1e-vtWA",
  },
});

function onSignal(code) {
  server.shutdown();
  process.exit(code);
}

process.on("SIGINT", () => onSignal(130));
process.on("SIGTERM", () => onSignal(143));

await server.ensureServer();

for (const script of E2E_SCRIPTS) {
  console.log(`\n==> ${script}`);
  const result = spawnSync("node", [script], {
    stdio: "inherit",
    env: {
      ...process.env,
      BASE_URL: server.base,
      CI: process.env.CI ?? "true",
    },
  });
  if (result.status !== 0) {
    server.shutdown();
    process.exit(result.status ?? 1);
  }
}

server.shutdown();
console.log("\nAll E2E suites passed.");
