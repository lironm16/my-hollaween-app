#!/usr/bin/env node
/**
 * Production deploy path: Origin/Cursor main → GitHub mirror → Vercel.
 * Vercel is wired to github.com/lironm16/my-hollaween-app (not Origin).
 *
 *   GITHUB_TOKEN=... VERCEL_TOKEN=... npm run deploy:production
 *
 * Optional: GITHUB_REPO=lironm16/my-hollaween-app
 */
import { execSync } from "node:child_process";

const githubRepo = process.env.GITHUB_REPO?.trim() || "lironm16/my-hollaween-app";
const githubToken = process.env.GITHUB_TOKEN?.trim();
const vercelToken = process.env.VERCEL_TOKEN?.trim();
const vercelTeamId = process.env.VERCEL_TEAM_ID?.trim() || "team_zM7kSCEfRW0gqHQ6YuqnJfxv";
const vercelProjectId =
  process.env.VERCEL_PROJECT_ID?.trim() || "prj_wdRubt9PSSmZEihp76taMmuyYuSe";
const vercelProjectName = process.env.VERCEL_PROJECT_NAME?.trim() || "my-hollaween-app";

if (!githubToken) {
  console.error("Missing GITHUB_TOKEN (needs repo scope).");
  process.exit(1);
}
if (!vercelToken) {
  console.error("Missing VERCEL_TOKEN.");
  process.exit(1);
}

const branch = process.env.DEPLOY_BRANCH?.trim() || "main";
const sha = execSync(`git rev-parse ${branch}`, { encoding: "utf8" }).trim();
const [org, repo] = githubRepo.split("/");
if (!org || !repo) {
  console.error("GITHUB_REPO must be org/name");
  process.exit(1);
}

const pushUrl = `https://x-access-token:${githubToken}@github.com/${githubRepo}.git`;
console.log(`Pushing ${branch} (${sha.slice(0, 7)}) → github.com/${githubRepo}…`);
execSync(`git push ${pushUrl} ${branch}:${branch}`, { stdio: "inherit" });

const deployUrl = new URL("https://api.vercel.com/v13/deployments");
deployUrl.searchParams.set("teamId", vercelTeamId);

const body = {
  name: vercelProjectName,
  project: vercelProjectId,
  target: "production",
  gitSource: {
    type: "github",
    org,
    repo,
    ref: branch,
    sha,
  },
};

console.log("Triggering Vercel production deployment…");
const res = await fetch(deployUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${vercelToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});
const json = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error("Vercel deploy failed:", res.status, json);
  process.exit(1);
}
console.log("Vercel deployment:", json.url ?? json.id ?? json);
console.log("Production:", "https://my-hollaween-app.vercel.app");
