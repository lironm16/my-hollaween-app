#!/usr/bin/env node
/**
 * Full automated test suite for CI and local verification:
 *   1. unit tests (src test files)
 *   2. production build
 *   3. stress test (starts server if needed)
 *   4. API integration (isolated server on port 43128)
 *   5. browser E2E suites (starts server if needed)
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
run("API integration", "node", ["scripts/run-api-tests.mjs"]);
run("Stress test", "node", ["scripts/run-stress.mjs"], {
  CONCURRENCY: process.env.CONCURRENCY ?? (process.env.CI ? "200" : "1000"),
});
run("Browser E2E", "node", ["scripts/run-e2e.mjs"]);

console.log("\nAll CI checks passed.");
