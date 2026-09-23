#!/usr/bin/env node
/**
 * Prepare .github/workflows on the GitHub mirror (manual / local use).
 * Copies deploy/github templates and removes Cursor-only workflows (e.g. ci.yml).
 * The scheduled sync-from-cursor workflow keeps GitHub's .github/ unchanged instead.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const forGithubMirror =
  process.argv.includes("--for-github-mirror") || process.env.GITHUB_ACTIONS === "true";
const rootArg = process.argv.slice(2).find((arg) => !arg.startsWith("-"));
const root = rootArg?.trim() || process.cwd();
const workflowDir = join(root, ".github/workflows");
const templateDir = join(root, "deploy/github");

if (!existsSync(templateDir)) {
  console.error(`Missing ${templateDir}`);
  process.exit(1);
}

mkdirSync(workflowDir, { recursive: true });

const templateNames = readdirSync(templateDir).filter(
  (name) => name.endsWith(".yml") || name.endsWith(".yaml"),
);

for (const name of templateNames) {
  cpSync(join(templateDir, name), join(workflowDir, name));
}

if (forGithubMirror && existsSync(workflowDir)) {
  for (const name of readdirSync(workflowDir)) {
    if (!templateNames.includes(name)) {
      unlinkSync(join(workflowDir, name));
      console.log(`Removed GitHub workflow not in deploy/github: ${name}`);
    }
  }
}

console.log(`Prepared ${templateNames.length} GitHub workflow(s) in .github/workflows.`);
