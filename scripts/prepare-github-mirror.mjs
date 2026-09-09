#!/usr/bin/env node
/**
 * Replace GitHub mirror workflows with sync-from-cursor only.
 * Use when bootstrapping auto-sync (needs a GitHub token with `workflow` scope,
 * or paste deploy/github/sync-from-cursor.yml in the GitHub web UI instead).
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2]?.trim() || process.cwd();
const workflowDir = join(root, ".github/workflows");
const template = join(root, "deploy/github/sync-from-cursor.yml");

if (!existsSync(template)) {
  console.error(`Missing ${template}`);
  process.exit(1);
}

if (existsSync(workflowDir)) {
  for (const name of readdirSync(workflowDir)) {
    if (name.endsWith(".yml") || name.endsWith(".yaml")) {
      rmSync(join(workflowDir, name));
    }
  }
} else {
  mkdirSync(workflowDir, { recursive: true });
}

cpSync(template, join(workflowDir, "sync-from-cursor.yml"));
console.log("Prepared GitHub mirror workflows (sync-from-cursor only).");
