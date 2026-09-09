#!/usr/bin/env node
/**
 * Copy deploy/github workflow templates into .github/workflows (merge, do not wipe).
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2]?.trim() || process.cwd();
const workflowDir = join(root, ".github/workflows");
const templateDir = join(root, "deploy/github");

if (!existsSync(templateDir)) {
  console.error(`Missing ${templateDir}`);
  process.exit(1);
}

mkdirSync(workflowDir, { recursive: true });

let copied = 0;
for (const name of readdirSync(templateDir)) {
  if (!name.endsWith(".yml") && !name.endsWith(".yaml")) continue;
  cpSync(join(templateDir, name), join(workflowDir, name));
  copied += 1;
}

console.log(`Prepared ${copied} GitHub workflow(s) in .github/workflows.`);
