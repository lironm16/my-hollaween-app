#!/usr/bin/env node
/**
 * Bump package.json version and sync PWA cache keys (sw.js, app-version.txt).
 *
 * Semver intent for this app:
 *   patch — production hotfix (small bugfix, no new product surface)
 *   minor — user-facing feature batch or notable UX release
 *   major — breaking change or pre-1.0 milestone (rare)
 *
 * Usage: node scripts/bump-app-version.mjs [patch|minor|major]
 * Default: patch
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const kind = (process.argv[2] ?? "patch").toLowerCase();
if (!["patch", "minor", "major"].includes(kind)) {
  console.error("Usage: node scripts/bump-app-version.mjs [patch|minor|major]");
  process.exit(1);
}

const root = dirname(fileURLToPath(import.meta.url));
const npmVersion = spawnSync("npm", ["version", kind, "--no-git-tag-version"], {
  cwd: join(root, ".."),
  stdio: "inherit",
});
if (npmVersion.status !== 0) process.exit(npmVersion.status ?? 1);

const sync = spawnSync("node", ["scripts/sync-sw-version.mjs"], {
  cwd: join(root, ".."),
  stdio: "inherit",
});
process.exit(sync.status ?? 0);
