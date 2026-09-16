#!/usr/bin/env node
/**
 * Run offline catalog E2E against a live server.
 * If BASE_URL is not reachable, starts `npm run start` (expects `npm run build` first).
 *
 *   npm run build && npm run test:e2e
 *   BASE_URL=http://127.0.0.1:43127 npm run test:e2e   # server already running
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = Number(process.env.PORT ?? 43127);
const BASE = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;
const START_TIMEOUT_MS = Number(process.env.E2E_START_TIMEOUT_MS ?? 90_000);

async function reachable() {
  try {
    const res = await fetch(`${BASE}/api/catalog`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

function npmRun(script) {
  return spawn("npm", ["run", script], {
    stdio: "inherit",
    env: { ...process.env, PORT: String(PORT) },
  });
}

let server = null;

async function ensureServer() {
  if (await reachable()) {
    console.log(`Using running server at ${BASE}`);
    return;
  }

  if (!existsSync(".next")) {
    console.error("No production build found. Run `npm run build` before the E2E test.");
    process.exit(1);
  }

  console.log(`Starting server on port ${PORT} for E2E test…`);
  server = npmRun("start");
  server.on("error", (error) => {
    console.error(error);
    process.exit(1);
  });

  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await reachable()) {
      console.log(`Server ready at ${BASE}`);
      return;
    }
    await sleep(500);
  }

  console.error(`Server did not become ready at ${BASE} within ${START_TIMEOUT_MS}ms`);
  server.kill("SIGTERM");
  process.exit(1);
}

function shutdownServer() {
  if (!server) return;
  server.kill("SIGTERM");
  server = null;
}

process.on("SIGINT", () => {
  shutdownServer();
  process.exit(130);
});
process.on("SIGTERM", () => {
  shutdownServer();
  process.exit(143);
});

await ensureServer();

const e2e = spawn("node", ["scripts/check-offline-catalog.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    BASE_URL: BASE,
    CI: process.env.CI ?? "true",
  },
});

e2e.on("exit", (code) => {
  shutdownServer();
  process.exit(code ?? 0);
});
