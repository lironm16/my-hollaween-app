#!/usr/bin/env node
/**
 * Run on your Mac inside the repo to see why night-pass changes might not show.
 *   node scripts/verify-night-pass-branch.mjs
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const EXPECTED_TIP = "e1f3c008";
const BRANCH = "cursor/night-passes-2e72";

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function trySh(cmd) {
  try {
    return sh(cmd);
  } catch {
    return null;
  }
}

const root = process.cwd();
const head = trySh("git rev-parse --short HEAD");
const branch = trySh("git branch --show-current");
const remotes = trySh("git remote -v");

console.log("=== Git ===");
console.log("cwd:", root);
console.log("branch:", branch);
console.log("HEAD:  ", head);
console.log("\nremotes:\n" + remotes);

if (branch !== BRANCH) {
  console.log(`\n⚠️  Not on ${BRANCH}. Run:\n  git fetch github && git checkout ${BRANCH} && git pull github ${BRANCH}`);
}

for (const remote of ["github", "origin"]) {
  const tip = trySh(`git rev-parse --short ${remote}/${BRANCH} 2>/dev/null`);
  if (tip) console.log(`\n${remote}/${BRANCH} → ${tip}`);
  else console.log(`\n(no local ref ${remote}/${BRANCH} — run: git fetch ${remote} ${BRANCH})`);
}

if (head && !head.startsWith(EXPECTED_TIP.slice(0, 7))) {
  console.log(`\n⚠️  Expected tip ~${EXPECTED_TIP}. Update:\n  git fetch github && git pull github ${BRANCH}`);
} else if (head) {
  console.log(`\n✓ HEAD matches expected night-pass tip (${EXPECTED_TIP}).`);
}

console.log("\n=== Files (must exist on latest branch) ===");
const markers = [
  "src/components/admin-style-strip.tsx",
  "src/components/night-pass-device-strip.tsx",
  "src/components/night-pass-banner.tsx",
];
for (const f of markers) {
  const ok = existsSync(join(root, f));
  console.log(ok ? "✓" : "✗", f);
}

const header = existsSync(join(root, "src/components/app-header.tsx"))
  ? readFileSync(join(root, "src/components/app-header.tsx"), "utf8")
  : "";
const banner = existsSync(join(root, "src/components/night-pass-banner.tsx"))
  ? readFileSync(join(root, "src/components/night-pass-banner.tsx"), "utf8")
  : "";
if (header.includes("NightPassRegisterPanel") && header.includes("showUnsignedPassLogin")) {
  console.log("\n✓ Unsigned night-pass login in the side menu.");
} else {
  console.log("\n✗ app-header missing menu login — pull latest main.");
}
if (banner.includes("BANNER_DISMISS_SESSION_KEY") && banner.includes("aria-label=\"סגירת ההודעה\"")) {
  console.log("✓ Map banner is dismissible (X) for this tab session.");
} else {
  console.log("✗ Map banner missing dismiss (X) — pull latest main.");
}

console.log("\n=== Dev server ===");
console.log("After pull: rm -rf .next && restart npm run dev");
console.log("Browser: DevTools → Application → Unregister service worker → hard refresh (Cmd+Shift+R)");
