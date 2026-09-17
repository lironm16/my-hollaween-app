#!/usr/bin/env node
/**
 * Run API integration tests against an isolated server (port 43128, DATA_DIR under artifacts/).
 */

import { spawnSync } from "node:child_process";
import { createTestServerManager, defaultApiDataDir, pickFreePort } from "./lib/test-server.mjs";

const dataDir = process.env.DATA_DIR ?? defaultApiDataDir();
const apiPort = Number(process.env.API_TEST_PORT ?? (await pickFreePort()));
const server = createTestServerManager({
  port: apiPort,
  dataDir,
  label: "api",
  extraEnv: {
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "pumpkin2026",
  },
  forceFresh: true,
});

function onSignal(code) {
  server.shutdown();
  process.exit(code);
}

process.on("SIGINT", () => onSignal(130));
process.on("SIGTERM", () => onSignal(143));

await server.ensureServer();

const result = spawnSync("node", ["scripts/api-integration.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    BASE_URL: server.base,
    PORT: String(apiPort),
    DATA_DIR: dataDir,
  },
});

server.shutdown();
process.exit(result.status ?? 0);
