#!/usr/bin/env node
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "docs");
mkdirSync(outDir, { recursive: true });
copyFileSync(
  join(root, "docs", "MANUAL_TEST_CHECKLIST.md"),
  join(outDir, "MANUAL_TEST_CHECKLIST.md"),
);
console.log("Copied manual test checklist to public/docs/");
