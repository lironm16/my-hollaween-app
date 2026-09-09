#!/usr/bin/env node
/**
 * Full automated test suite for CI and local verification:
 *   1. unit tests (src test files)
 *   2. production build
 *   3. stress test (starts server if needed)
 */

import { spawnSync } from "node:child_process";

function run(label, command, args, env = {}) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("Unit tests", "npm", ["run", "test:unit"]);
run("Production build", "npm", ["run", "build"]);
run("Stress test", "node", ["scripts/run-stress.mjs"], {
  CONCURRENCY: process.env.CONCURRENCY ?? (process.env.CI ? "200" : "1000"),
});

console.log("\nAll CI checks passed.");
