#!/usr/bin/env node
/**
 * Copy clean install photos (JPEG). Highlights are CSS — src/lib/help-shot-highlight.ts.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "scripts", "assets");
const HELP_WIDTH = 960;

async function writeJpegFrom(src, relPath) {
  const full = join(root, relPath);
  mkdirSync(dirname(full), { recursive: true });
  await sharp(src)
    .rotate()
    .resize({ width: HELP_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(full);
}

async function writePairJpeg(src, baseName) {
  for (const dir of ["public/images/help/install", "public/help/install"]) {
    await writeJpegFrom(src, `${dir}/${baseName}`);
  }
}

function writePairCopy(src, baseName) {
  for (const dir of ["public/images/help/install", "public/help/install"]) {
    const full = join(root, dir, baseName);
    mkdirSync(dirname(full), { recursive: true });
    copyFileSync(src, full);
  }
}

const shareSrc = process.env.IOS_SHARE_SRC ?? join(assets, "ios-install-share-source.jpg");
const homeSrc = process.env.IOS_ADD_HOME_SRC ?? join(assets, "ios-install-add-home-source.png");
const confirmSrc =
  process.env.IOS_ADD_CONFIRM_SRC ?? join(assets, "ios-install-add-confirm-source.jpg");
const playProtectSrc =
  process.env.ANDROID_PLAY_PROTECT_SRC ?? join(assets, "android-play-protect-source.jpg");

const androidHeader =
  process.env.ANDROID_HEADER_SRC ??
  join(assets, "android-header-install.png");

async function writeAndroidStepImages() {
  await writePairJpeg(androidHeader, "android-2-install.jpg");
}

await writeAndroidStepImages();

writePairCopy(shareSrc, "ios-2-share-photo.jpg");
writePairCopy(homeSrc, "ios-3-add-home-photo.png");
writePairCopy(confirmSrc, "ios-4-add-confirm-photo.jpg");

await writePairJpeg(playProtectSrc, "android-play-protect.jpg");

console.log("Wrote install help photos (iOS clean, Android JPEG; overlays in CSS).");
