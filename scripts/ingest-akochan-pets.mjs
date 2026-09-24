#!/usr/bin/env node
/**
 * Copy individual pet GLBs from Projects/akochan-halloween-pets/ → public/gem-monsters/
 * Skips bundle/combined scenes and files over 20MB (GitHub web upload friendly).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "Projects", "akochan-halloween-pets");
const DEST = path.join(ROOT, "public", "gem-monsters");
const MAX_BYTES = 20 * 1024 * 1024;

const SKIP_NAME = /bundle|combined|all[_-]?models|scene/i;

function walkGlb(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkGlb(full, out);
    else if (name.toLowerCase().endsWith(".glb")) out.push(full);
  }
  return out;
}

function slugBase(filePath) {
  const base = path.basename(filePath, ".glb");
  return base
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "");
}

const glbs = walkGlb(SRC).filter((p) => !SKIP_NAME.test(path.basename(p)));
if (glbs.length === 0) {
  console.error(`No .glb files under ${SRC}`);
  console.error("Download the pack from itch, unzip, copy pet GLBs into that folder.");
  process.exit(1);
}

fs.mkdirSync(DEST, { recursive: true });
let copied = 0;
for (const src of glbs) {
  const st = fs.statSync(src);
  if (st.size > MAX_BYTES) {
    console.warn(`Skip (>${MAX_BYTES}): ${path.basename(src)}`);
    continue;
  }
  const destName = `${slugBase(src)}.glb`;
  const dest = path.join(DEST, destName);
  fs.copyFileSync(src, dest);
  console.log(`${path.basename(src)} → public/gem-monsters/${destName} (${(st.size / 1024).toFixed(1)} KB)`);
  copied += 1;
}

if (copied === 0) process.exit(1);
console.log(`\nCopied ${copied} file(s). Next: npm run gem-monster-posters (and commit public/gem-monsters + gem-monsters-shipped.json)`);
