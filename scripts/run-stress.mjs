#!/usr/bin/env node
/**
 * Run the stress test against an isolated server (DATA_DIR under artifacts/).
 * If BASE_URL is reachable and forceFresh is off, reuses that server.
 *
 *   npm run build && npm run test:stress
 *   BASE_URL=http://127.0.0.1:43127 npm run test:stress
 */

import { spawn } from "node:child_process";
import {
  createTestServerManager,
  defaultStressDataDir,
  pickFreePort,
} from "./lib/test-server.mjs";

const dataDir = process.env.DATA_DIR ?? defaultStressDataDir();
const stressPort = Number(process.env.STRESS_TEST_PORT ?? process.env.PORT ?? (await pickFreePort()));
const baseFromEnv = process.env.BASE_URL?.trim();
const server = createTestServerManager({
  port: stressPort,
  dataDir,
  label: "stress",
  forceFresh: !baseFromEnv,
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

const base = baseFromEnv ?? (await server.ensureServer());

const stress = spawn("node", ["scripts/stress-test.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    BASE_URL: base,
    CONCURRENCY: process.env.CONCURRENCY ?? (process.env.CI ? "200" : "1000"),
  },
});

stress.on("exit", (code) => {
  server.shutdown();
  process.exit(code ?? 0);
});
