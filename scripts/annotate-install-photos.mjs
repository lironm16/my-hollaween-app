#!/usr/bin/env node
/**
 * Overlay orange highlights on real install-help screenshots.
 * Tune *_REGIONS below when source photos change.
 *
 *   node scripts/annotate-install-photos.mjs
 *   IOS_SHARE_SRC=... IOS_ADD_HOME_SRC=... ANDROID_PLAY_PROTECT_SRC=... node scripts/annotate-install-photos.mjs
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "scripts", "assets");
const ORANGE = "#ff9500";

const IOS_SHARE = { cx: 0.502, cy: 0.968, r: 0.038 };
const IOS_ADD_HOME = { padX: 0.04, rowStartY: 0.248, rowHeight: 0.048, rowIndex: 4 };
/** «הבנתי» on Google Play Protect sheet (923×2000 reference). */
const ANDROID_PLAY_PROTECT = { padX: 0.1, y: 0.612, h: 0.055, w: 0.8 };

function ringOverlay(w, h, cx, cy, r) {
  const sw = Math.max(4, w * 0.006);
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ORANGE}" stroke-width="${sw}" />
    <circle cx="${cx}" cy="${cy}" r="${r + w * 0.012}" fill="none" stroke="${ORANGE}" stroke-width="2" stroke-dasharray="10 6" opacity="0.9"/>
  </svg>`);
}

function rowOverlay(w, h, padX, y, rw, rh) {
  const stroke = Math.max(3, w * 0.005);
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${padX}" y="${y}" width="${rw}" height="${rh}" rx="${rh * 0.2}" fill="rgba(255,149,0,0.22)" stroke="${ORANGE}" stroke-width="${stroke}"/>
  </svg>`);
}

async function annotateShare(src) {
  const meta = await sharp(src).metadata();
  const w = meta.width;
  const h = meta.height;
  const cx = w * IOS_SHARE.cx;
  const cy = h * IOS_SHARE.cy;
  const r = w * IOS_SHARE.r;
  const svg = ringOverlay(w, h, cx, cy, r);
  return sharp(src).composite([{ input: svg, top: 0, left: 0 }]).png({ compressionLevel: 9 }).toBuffer();
}

async function annotateAddHome(src) {
  const meta = await sharp(src).metadata();
  const w = meta.width;
  const h = meta.height;
  const padX = w * IOS_ADD_HOME.padX;
  const rh = h * IOS_ADD_HOME.rowHeight;
  const y = h * IOS_ADD_HOME.rowStartY + rh * IOS_ADD_HOME.rowIndex;
  const rw = w - padX * 2;
  const svg = rowOverlay(w, h, padX, y, rw, rh);
  return sharp(src).composite([{ input: svg, top: 0, left: 0 }]).png({ compressionLevel: 9 }).toBuffer();
}

async function annotatePlayProtect(src) {
  const meta = await sharp(src).metadata();
  const w = meta.width;
  const h = meta.height;
  const padX = w * ANDROID_PLAY_PROTECT.padX;
  const y = h * ANDROID_PLAY_PROTECT.y;
  const rh = h * ANDROID_PLAY_PROTECT.h;
  const rw = w * ANDROID_PLAY_PROTECT.w;
  const x = (w - rw) / 2;
  const svg = rowOverlay(w, h, x, y, rw, rh);
  return sharp(src).composite([{ input: svg, top: 0, left: 0 }]).png({ compressionLevel: 9 }).toBuffer();
}

async function writeOut(buf, relPath) {
  const full = join(root, relPath);
  mkdirSync(dirname(full), { recursive: true });
  await sharp(buf).toFile(full);
}

async function writePair(buf, baseName) {
  for (const dir of ["public/images/help/install", "public/help/install"]) {
    await writeOut(buf, `${dir}/${baseName}`);
  }
}

const shareSrc = process.env.IOS_SHARE_SRC ?? join(assets, "ios-install-share-source.jpg");
const homeSrc = process.env.IOS_ADD_HOME_SRC ?? join(assets, "ios-install-add-home-source.png");
const playProtectSrc =
  process.env.ANDROID_PLAY_PROTECT_SRC ?? join(assets, "android-play-protect-source.jpg");

await writePair(await annotateShare(shareSrc), "ios-2-share.png");
await writePair(await annotateAddHome(homeSrc), "ios-3-add-home.png");
await writePair(await annotatePlayProtect(playProtectSrc), "android-play-protect.png");

console.log("Wrote annotated install help screenshots.");
