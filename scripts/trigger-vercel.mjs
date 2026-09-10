#!/usr/bin/env node
/**
 * Trigger a Vercel production deploy via Deploy Hook.
 * Create one in Vercel → Project → Settings → Git → Deploy Hooks.
 *
 *   VERCEL_DEPLOY_HOOK=https://api.vercel.com/v1/integrations/deploy/... npm run deploy:vercel
 */
const hook = process.env.VERCEL_DEPLOY_HOOK?.trim();
if (!hook) {
  console.error("Missing VERCEL_DEPLOY_HOOK.");
  console.error("Vercel → my-hollaween-app → Settings → Git → Deploy Hooks → Add (branch: main)");
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
