#!/usr/bin/env node
/**
 * Copy clean iOS install photos; bake Play Protect highlight only (Android).
 * iOS highlights are CSS overlays — tune src/lib/help-shot-highlight.ts.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "scripts", "assets");
const ORANGE = "#ff9500";
const HELP_WIDTH = 960;

function rowOverlay(w, h, padX, y, rw, rh) {
  const stroke = Math.max(3, w * 0.005);
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${padX}" y="${y}" width="${rw}" height="${rh}" rx="${rh * 0.2}" fill="rgba(255,149,0,0.22)" stroke="${ORANGE}" stroke-width="${stroke}"/>
  </svg>`);
}

async function rawRgb(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, c: info.channels };
}

/** «פרטים נוספים» link row — above the blue **הבנתי** button. */
async function detectPlayProtectDetailsLink(src) {
  const meta = await sharp(src).metadata();
  const w = meta.width;
  const h = meta.height;
  const padX = w * 0.14;
  const y = h * 0.592;
  const rh = h * 0.042;
  return { padX, y, rw: w - padX * 2, rh };
}

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

async function annotatePlayProtect(src) {
  const box = await detectPlayProtectDetailsLink(src);
  const meta = await sharp(src).metadata();
  const w = meta.width;
  const h = meta.height;
  const svg = rowOverlay(w, h, box.padX, box.y, box.rw, box.rh);
  return sharp(src).composite([{ input: svg, top: 0, left: 0 }]).png({ compressionLevel: 9 }).toBuffer();
}

const shareSrc = process.env.IOS_SHARE_SRC ?? join(assets, "ios-install-share-source.jpg");
const homeSrc = process.env.IOS_ADD_HOME_SRC ?? join(assets, "ios-install-add-home-source.png");
const confirmSrc =
  process.env.IOS_ADD_CONFIRM_SRC ?? join(assets, "ios-install-add-confirm-source.jpg");
const playProtectSrc =
  process.env.ANDROID_PLAY_PROTECT_SRC ?? join(assets, "android-play-protect-source.jpg");

const androidAppFull = join(root, "public", "help", "install", "android-1-app.png");
const androidHeader =
  process.env.ANDROID_HEADER_SRC ??
  join(assets, "android-header-install.png");

async function writeAndroidStepImages() {
  const meta = await sharp(androidAppFull).metadata();
  const topCrop = Math.min(480, meta.height ?? 480);
  const topBuf = await sharp(androidAppFull)
    .extract({ left: 0, top: 0, width: meta.width, height: topCrop })
    .toBuffer();
  await writePairJpeg(topBuf, "android-1-app.jpg");
  await writePairJpeg(androidHeader, "android-2-install.jpg");
}

await writeAndroidStepImages();

writePairCopy(shareSrc, "ios-2-share-photo.jpg");
writePairCopy(homeSrc, "ios-3-add-home-photo.png");
writePairCopy(confirmSrc, "ios-4-add-confirm-photo.jpg");

const playBuf = await annotatePlayProtect(playProtectSrc);
const playTmp = join(root, ".tmp-play-protect.png");
await sharp(playBuf).toFile(playTmp);
await writePairJpeg(playTmp, "android-play-protect.jpg");

console.log("Wrote install help photos (iOS clean, Android JPEG, Play Protect annotated).");
