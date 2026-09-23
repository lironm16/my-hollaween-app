/**
 * @deprecated Use `npm run poi-pin-icons` (extract-badge-glyphs.py).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync("python3", ["scripts/extract-badge-glyphs.py"], {
  cwd: root,
  stdio: "inherit",
});
process.exit(r.status ?? 1);
