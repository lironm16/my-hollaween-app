#!/usr/bin/env node
/**
 * Trigger a Vercel production deploy.
 *
 *   VERCEL_TOKEN=... npm run deploy:vercel
 *   VERCEL_DEPLOY_HOOK=https://api.vercel.com/v1/integrations/deploy/... npm run deploy:vercel
 */
import { execSync } from "node:child_process";

const hook = process.env.VERCEL_DEPLOY_HOOK?.trim();
const token = process.env.VERCEL_TOKEN?.trim();

if (token) {
  execSync("npx vercel deploy --prod --yes --token " + JSON.stringify(token), {
    stdio: "inherit",
    cwd: new URL("..", import.meta.url).pathname,
  });
  process.exit(0);
}

if (!hook) {
  console.error("Missing VERCEL_TOKEN or VERCEL_DEPLOY_HOOK.");
  console.error("Add VERCEL_TOKEN to Cloud Agent secrets, or create a Deploy Hook in Vercel → Settings → Git.");
  process.exit(1);
}

const res = await fetch(hook, { method: "POST" });
const body = await res.text();
if (!res.ok) {
  console.error(`Deploy hook failed (${res.status}): ${body}`);
  process.exit(1);
}
console.log("Vercel deploy triggered.");
if (body) console.log(body);
