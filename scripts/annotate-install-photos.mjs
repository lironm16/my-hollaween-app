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

async function detectPlayProtectButton(src) {
  const { data, w, h, c } = await rawRgb(src);
  let minX = 1e9;
  let minY = 1e9;
  let maxX = 0;
  let maxY = 0;
  let n = 0;
  for (let y = Math.floor(h * 0.5); y < Math.floor(h * 0.78); y++) {
    for (let x = Math.floor(w * 0.1); x < Math.floor(w * 0.9); x++) {
      const i = (y * w + x) * c;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (b > 140 && g > 80 && r < 80 && b > g) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        n++;
      }
    }
  }
  if (n < 100) {
    return { padX: w * 0.1, y: h * 0.666, rw: w * 0.8, rh: h * 0.048 };
  }
  const pad = w * 0.028;
  const padY = h * 0.012;
  return {
    padX: minX - pad,
    y: minY - padY,
    rw: maxX - minX + pad * 2,
    rh: maxY - minY + padY * 2,
  };
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
  const box = await detectPlayProtectButton(src);
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
await writePairJpeg(androidAppFull, "android-1-app.jpg");

writePairCopy(shareSrc, "ios-2-share-photo.jpg");
writePairCopy(homeSrc, "ios-3-add-home-photo.png");
writePairCopy(confirmSrc, "ios-4-add-confirm-photo.jpg");

const playBuf = await annotatePlayProtect(playProtectSrc);
const playTmp = join(root, ".tmp-play-protect.png");
await sharp(playBuf).toFile(playTmp);
await writePairJpeg(playTmp, "android-play-protect.jpg");

console.log("Wrote install help photos (iOS clean, Android JPEG, Play Protect annotated).");
