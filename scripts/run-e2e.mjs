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
