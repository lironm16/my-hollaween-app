#!/usr/bin/env node
/**
 * Overlay orange highlights on real iOS Safari install screenshots.
 * Sources: repo-relative paths or env IOS_SHARE_SRC / IOS_ADD_HOME_SRC.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORANGE = "#ff9500";

const shareSrc =
  process.env.IOS_SHARE_SRC ??
  join(root, "scripts", "assets", "ios-install-share-source.jpg");
const homeSrc =
  process.env.IOS_ADD_HOME_SRC ??
  join(root, "scripts", "assets", "ios-install-add-home-source.png");

async function annotateShare() {
  const meta = await sharp(shareSrc).metadata();
  const w = meta.width;
  const h = meta.height;
  const cx = w * 0.502;
  const cy = h * 0.968;
  const r = w * 0.038;
  const sw = Math.max(4, w * 0.006);
  const svg = Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ORANGE}" stroke-width="${sw}" />
    <circle cx="${cx}" cy="${cy}" r="${r + w * 0.012}" fill="none" stroke="${ORANGE}" stroke-width="2" stroke-dasharray="10 6" opacity="0.9"/>
  </svg>`);
  return sharp(shareSrc).composite([{ input: svg, top: 0, left: 0 }]).png({ compressionLevel: 9 }).toBuffer();
}

async function annotateAddHome() {
  const meta = await sharp(homeSrc).metadata();
  const w = meta.width;
  const h = meta.height;
  const padX = w * 0.04;
  const rowH = h * 0.048;
  const y = h * 0.248 + rowH * 4;
  const rh = rowH;
  const rw = w - padX * 2;
  const stroke = Math.max(3, w * 0.005);
  const svg = Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${padX}" y="${y}" width="${rw}" height="${rh}" rx="${rh * 0.2}" fill="rgba(255,149,0,0.22)" stroke="${ORANGE}" stroke-width="${stroke}"/>
  </svg>`);
  return sharp(homeSrc).composite([{ input: svg, top: 0, left: 0 }]).png({ compressionLevel: 9 }).toBuffer();
}

async function writeOut(buf, relPath) {
  const full = join(root, relPath);
  mkdirSync(dirname(full), { recursive: true });
  await sharp(buf).toFile(full);
}

const shareBuf = await annotateShare();
const homeBuf = await annotateAddHome();

for (const rel of [
  "public/images/help/install/ios-2-share.png",
  "public/help/install/ios-2-share.png",
]) {
  await writeOut(shareBuf, rel);
}
for (const rel of [
  "public/images/help/install/ios-3-add-home.png",
  "public/help/install/ios-3-add-home.png",
]) {
  await writeOut(homeBuf, rel);
}

console.log("Wrote annotated iOS install screenshots.");
