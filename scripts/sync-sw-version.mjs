import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version ?? "0.0.0";

writeFileSync(join(root, "public/app-version.txt"), `${version}\n`, "utf8");

const swPath = join(root, "public/sw.js");
let sw = readFileSync(swPath, "utf8");

if (!/^const APP_VERSION = "/m.test(sw)) {
  sw = sw.replace(
    /^importScripts\([^)]+\);\n\n/,
    (head) => `${head}const APP_VERSION = "${version}";\n`,
  );
}

sw = sw.replace(/^const APP_VERSION = "[^"]*";$/m, `const APP_VERSION = "${version}";`);
sw = sw.replace(/^const CACHE = "[^"]*";$/m, `const CACHE = "hw-shell-${version}";`);

writeFileSync(swPath, sw);
console.log(`synced sw.js + app-version.txt to v${version}`);
