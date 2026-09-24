#!/usr/bin/env node
/**
 * Lists gem GLBs present under public/gem-monsters for runtime catalog filtering.
 * Run on build (and after gem-monsters:ingest) so production uses every shipped pet.
 */
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public", "gem-monsters");
const outPath = join(root, "src", "lib", "gem-monsters-shipped.json");

const SKIP = new Set(["HalloweenSpookyPetPack18.glb"]);

function listShippedIds() {
  if (!existsSync(publicDir)) return ["dragon"];
  const ids = readdirSync(publicDir)
    .filter((name) => name.endsWith(".glb") && !SKIP.has(name))
    .map((name) => name.replace(/\.glb$/i, ""))
    .sort();
  if (ids.length === 0) return ["dragon"];
  return ids;
}

const ids = listShippedIds();
writeFileSync(outPath, `${JSON.stringify(ids, null, 2)}\n`, "utf8");
console.log(`gem-monsters-shipped: ${ids.length} model(s) → ${outPath}`);
