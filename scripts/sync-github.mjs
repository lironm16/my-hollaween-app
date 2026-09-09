#!/usr/bin/env node
/**
 * Mirror Cursor main → GitHub (triggers Vercel auto-deploy).
 *
 *   GITHUB_TOKEN=ghp_... npm run sync:github
 */
import { execSync } from "node:child_process";

const token = process.env.GITHUB_TOKEN?.trim();
const repo = process.env.GITHUB_REPO?.trim() || "lironm16/my-hollaween-app";
const branch = process.env.GITHUB_BRANCH?.trim() || "main";

if (!token) {
  console.error("Missing GITHUB_TOKEN — create one at https://github.com/settings/tokens");
  console.error("Required scopes: repo (or fine-grained: Contents read/write on my-hollaween-app)");
  process.exit(1);
}

const remote = `https://x-access-token:${token}@github.com/${repo}.git`;

console.log(`Pushing ${branch} to github.com/${repo}…`);
execSync(`git push ${remote} HEAD:${branch} --force`, { stdio: "inherit" });

console.log("Done. Vercel should start a production deploy from the GitHub push.");
