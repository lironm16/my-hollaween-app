#!/usr/bin/env node
/**
 * Split a combined Akochan-style GLB (all pets in one scene) into one GLB per
 * top-level scene child. Output → public/gem-monsters/ by default.
 *
 *   node scripts/split-combined-gem-glb.mjs path/to/HalloweenSpookyPetPack18.glb
 */
import fs from "node:fs";
import path from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import { copyToDocument, createDefaultPropertyResolver, dedup, prune } from "@gltf-transform/functions";

const root = path.resolve(import.meta.dirname, "..");
const input = process.argv[2];
const outDir = process.argv[3] ?? path.join(root, "public", "gem-monsters");

if (!input) {
  console.error("Usage: node scripts/split-combined-gem-glb.mjs <combined.glb> [outDir]");
  process.exit(1);
}

function slug(name, index) {
  const base =
    name
      ?.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "") || `pet-${index}`;
  return base.replace(/^-+|-+$/g, "") || `pet-${index}`;
}

const io = new NodeIO();
const source = await io.read(path.resolve(input));
const scene = source.getRoot().getDefaultScene();
if (!scene) {
  console.error("No default scene in GLB");
  process.exit(1);
}

const direct = scene.listChildren();
let children = direct;

/** Akochan “all in one” GLB often has one root empty with 18 pets underneath. */
if (direct.length === 1) {
  const nested = direct[0].listChildren();
  if (nested.length >= 2 && nested.length <= 40) {
    children = nested;
    console.log(`Using ${nested.length} nodes under "${direct[0].getName() || "root"}"`);
  }
}

/** Rigged single creatures (e.g. Molotov dragon) have many mesh parts at scene root — do not split. */
const meshPartish = direct.filter((n) => /^Cube\.|^Sphere\.|^Mesh\./i.test(n.getName() || ""));
if (direct.length > 8 && meshPartish.length >= direct.length * 0.5) {
  console.error(
    "This GLB looks like one rigged character (many mesh parts), not an 18-pet bundle.",
  );
  console.error("Use individual .fbx / .glb from the itch zip (GLB or FBX folders), not split.");
  process.exit(1);
}

if (children.length === 0) {
  console.error("No scene children to split");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const written = [];

for (let i = 0; i < children.length; i += 1) {
  const child = children[i];
  const name = child.getName()?.trim() || `pet-${i + 1}`;
  const file = `${slug(name, i + 1)}.glb`;
  const target = new Document();
  const targetScene = target.createScene(name);
  const resolve = createDefaultPropertyResolver(target, source);
  const map = copyToDocument(target, source, [child], resolve);
  const copied = map.get(child);
  if (!copied) {
    console.warn(`Skip (copy failed): ${name}`);
    continue;
  }
  targetScene.addChild(copied);
  await dedup()(target);
  await prune()(target);
  const outPath = path.join(outDir, file);
  await io.write(outPath, target);
  const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`${name} → ${file} (${kb} KB)`);
  written.push(file);
}

if (written.length === 0) process.exit(1);
console.log(`\nWrote ${written.length} GLB(s) to ${outDir}`);
console.log("Next: register ids in src/lib/gem-monsters.ts and npm run gem-monster-posters");
