import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cjs = require.resolve("next/dist/server/lib/router-utils/block-cross-site-dev.js");
const esm = cjs.replace("/dist/server/", "/dist/esm/server/");

const needles = [
  "const blockCrossSiteDEV = (req, res, allowedDevOrigins, hostname)=>{",
  "export const blockCrossSiteDEV = (req, res, allowedDevOrigins, hostname)=>{",
];

function patch(file) {
  if (!existsSync(file)) {
    console.warn(`preview origin patch skipped — missing ${file}`);
    return;
  }
  const source = readFileSync(file, "utf8");
  if (source.includes("CURSOR_ALLOW_NULL_ORIGIN")) {
    console.log(`preview origin patch already applied: ${file}`);
    return;
  }
  const needle = needles.find((n) => source.includes(n));
  if (!needle) {
    console.warn(`could not patch Next.js CSRF block — function signature changed in ${file}`);
    return;
  }
  writeFileSync(
    file,
    source.replace(
      needle,
      `${needle}\n    // CURSOR_ALLOW_NULL_ORIGIN: Preview iframes send Origin: null and would 403 /_next.\n    return false;`,
    ),
  );
  console.log(`patched Next.js blockCrossSiteDEV for Preview: ${file}`);
}

patch(cjs);
patch(esm);
