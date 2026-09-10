#!/usr/bin/env node
/**
 * Mirror Cursor → GitHub (triggers Vercel auto-deploy).
 *
 * Updates app files only and leaves `.github/` on GitHub untouched, so a normal
 * `repo` token works. The auto-sync workflow is added once via GitHub UI
 * (deploy/github/sync-from-cursor.yml) with ORIGIN_GIT_TOKEN configured.
 *
 *   GITHUB_TOKEN=ghp_... npm run sync:github
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const token = process.env.GITHUB_TOKEN?.trim();
const repo = process.env.GITHUB_REPO?.trim() || "lironm16/my-hollaween-app";
const branch = process.env.GITHUB_BRANCH?.trim() || "main";

if (!token) {
  console.error("Missing GITHUB_TOKEN — create one at https://github.com/settings/tokens");
  console.error("Required scopes: repo (or fine-grained: Contents read/write on my-hollaween-app)");
  process.exit(1);
}

const remote = `https://x-access-token:${token}@github.com/${repo}.git`;
const sourceRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
const sourceBranch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
const tmp = mkdtempSync(join(tmpdir(), "gh-mirror-"));

const SKIP = new Set([".git", ".github", "node_modules", ".next"]);

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", ...opts });
}

function copyTree(from, to) {
  for (const name of readdirSync(from)) {
    if (SKIP.has(name)) continue;
    const src = join(from, name);
    const dest = join(to, name);
    rmSync(dest, { recursive: true, force: true });
    cpSync(src, dest, { recursive: true });
  }
}

try {
  console.log(`Fetching github.com/${repo} (${branch})…`);
  run(`git clone --branch ${branch} --single-branch ${remote} "${tmp}"`);

  console.log(`Copying ${sourceBranch} app files (keeping GitHub .github/ as-is)…`);
  copyTree(sourceRoot, tmp);

  run(`git -C "${tmp}" add -A`);
  try {
    run(`git -C "${tmp}" diff --staged --quiet`);
    console.log("GitHub mirror already matches Cursor branch — nothing to push.");
  } catch {
    run(`git -C "${tmp}" commit -m "Sync HallowHood from Cursor (${sourceBranch})"`);
    console.log(`Pushing ${branch} to github.com/${repo}…`);
    run(`git -C "${tmp}" push origin HEAD:${branch}`);
    console.log("Done. Vercel should start a production deploy from the GitHub push.");
  }

  if (!existsSync(join(tmp, ".github/workflows/sync-from-cursor.yml"))) {
    console.log("");
    console.log("Auto-sync is not set up yet on GitHub.");
    console.log("One-time: add deploy/github/sync-from-cursor.yml as");
    console.log(".github/workflows/sync-from-cursor.yml in the GitHub repo, then set");
    console.log("ORIGIN_GIT_TOKEN in Settings → Secrets → Actions.");
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
