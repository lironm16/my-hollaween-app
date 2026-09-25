#!/usr/bin/env node
/**
 * Paths merged on Cursor → GitHub sync: GitHub keeps files missing from Cursor
 * (e.g. large gem GLBs pushed from Mac). Cursor wins when the same path exists.
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Relative paths to directories that use no-clobber merge (not full mirror wipe). */
export const SYNC_PRESERVE_DIRS = [
  "public/gem-monsters",
  "public/house-photos",
  "public/images",
];

export function backupPreserveDirs(repoRoot, backupRoot) {
  for (const rel of SYNC_PRESERVE_DIRS) {
    const src = join(repoRoot, rel);
    if (!existsSync(src)) continue;
    cpSync(src, join(backupRoot, rel), { recursive: true });
  }
}

/** Copy files from backup into repo only where dest file is missing. */
export function mergePreserveDirs(backupRoot, repoRoot) {
  for (const rel of SYNC_PRESERVE_DIRS) {
    const src = join(backupRoot, rel);
    if (!existsSync(src)) continue;
    mergeDirNoClobber(src, join(repoRoot, rel));
  }
}

function mergeDirNoClobber(fromDir, toDir) {
  mkdirSync(toDir, { recursive: true });
  for (const ent of readdirSync(fromDir, { withFileTypes: true })) {
    const srcPath = join(fromDir, ent.name);
    const destPath = join(toDir, ent.name);
    if (ent.isDirectory()) {
      mergeDirNoClobber(srcPath, destPath);
    } else if (!existsSync(destPath)) {
      cpSync(srcPath, destPath);
    }
  }
}
