import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const file = require.resolve("next/dist/server/lib/router-utils/block-cross-site-dev.js");
const source = readFileSync(file, "utf8");
if (source.includes("CURSOR_ALLOW_NULL_ORIGIN")) {
  console.log("preview origin patch already applied");
  process.exit(0);
}
const needle = "const blockCrossSiteDEV = (req, res, allowedDevOrigins, hostname)=>{";
if (!source.includes(needle)) {
  console.warn("could not patch Next.js CSRF block — function signature changed");
  process.exit(0);
}
const patched = source.replace(
  needle,
  `${needle}\n    // CURSOR_ALLOW_NULL_ORIGIN: Preview iframes send Origin: null and would 403 /_next.\n    return false;`,
);
writeFileSync(file, patched);
console.log("patched Next.js blockCrossSiteDEV for Preview");
