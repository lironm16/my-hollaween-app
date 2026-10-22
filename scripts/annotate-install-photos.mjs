#!/usr/bin/env node
/**
 * Overlay orange highlights on real install-help screenshots.
 * Positions are detected from pixels; override with env JSON if needed.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "scripts", "assets");
const ORANGE = "#ff9500";

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

async function rawRgb(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, c: info.channels };
}

/** Safari bottom toolbar — Share is the middle blue icon cluster. */
async function detectIosShare(src) {
  const { data, w, h, c } = await rawRgb(src);
  const y0 = h - Math.floor(h * 0.085);
  const buckets = Array.from({ length: 12 }, () => ({ sx: 0, sy: 0, n: 0 }));
  for (let y = y0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * c;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (b > 150 && b > r + 25 && b > g) {
        const bkt = Math.min(11, Math.floor((x / w) * 12));
        buckets[bkt].sx += x;
        buckets[bkt].sy += y;
        buckets[bkt].n++;
      }
    }
  }
  const active = buckets
    .map((b, i) => ({ i, ...b, cx: b.n ? b.sx / b.n : 0, cy: b.n ? b.sy / b.n : 0 }))
    .filter((b) => b.n > 40);
  const centerish = active.filter((b) => b.cx / w > 0.38 && b.cx / w < 0.62);
  const pick =
    centerish.sort((a, b) => b.n - a.n)[0] ??
    active.sort((a, b) => Math.abs(a.cx / w - 0.5) - Math.abs(b.cx / w - 0.5))[0];
  if (!pick?.n) {
    return { cx: w * 0.5, cy: h * 0.933, r: w * 0.038 };
  }
  return { cx: pick.cx, cy: pick.cy, r: w * 0.038 };
}

/** Share sheet — highlight the «Add to Home Screen» row (4th action). */
async function detectIosAddHomeRow(src) {
  const { data, w, h, c } = await rawRgb(src);
  const candidates = [];
  for (let y = Math.floor(h * 0.18); y < Math.floor(h * 0.52); y += 2) {
    let white = 0;
    for (let x = Math.floor(w * 0.06); x < Math.floor(w * 0.18); x++) {
      const i = (y * w + x) * c;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 200 && g > 200 && b > 200) white++;
    }
    candidates.push({ y, white });
  }
  const peaks = candidates.filter(
    (p, i, a) => p.white > 30 && (i === 0 || p.white >= a[i - 1].white) && (i === a.length - 1 || p.white >= a[i + 1].white),
  );
  const sorted = peaks.sort((a, b) => a.y - b.y);
  const groups = [];
  for (const p of sorted) {
    const merge = groups.find((g) => Math.abs(g.y - p.y) <= h * 0.028);
    if (merge) merge.y = (merge.y + p.y) / 2;
    else groups.push({ y: p.y });
  }
  groups.sort((a, b) => a.y - b.y);
  const menuGroups = groups.filter((g) => g.y / h < 0.52);
  const addHomeGroup = menuGroups.at(-1);
  const rowCenterY = addHomeGroup?.y ?? h * 0.42;
  const rh = h * 0.042;
  const y = rowCenterY - rh * 0.5;
  const padX = w * 0.035;
  return { padX, y, rw: w - padX * 2, rh };
}

/** Play Protect dialog — blue «הבנתי» pill. */
async function detectPlayProtectButton(src) {
  const { data, w, h, c } = await rawRgb(src);
  let minX = 1e9;
  let minY = 1e9;
  let maxX = 0;
  let maxY = 0;
  let n = 0;
  for (let y = Math.floor(h * 0.58); y < Math.floor(h * 0.74); y++) {
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
  const pad = w * 0.012;
  return {
    padX: minX - pad,
    y: minY - pad,
    rw: maxX - minX + pad * 2,
    rh: maxY - minY + pad * 2,
  };
}

async function annotateShare(src) {
  const { cx, cy, r } = await detectIosShare(src);
  const meta = await sharp(src).metadata();
  const w = meta.width;
  const h = meta.height;
  const svg = ringOverlay(w, h, cx, cy, r);
  return sharp(src).composite([{ input: svg, top: 0, left: 0 }]).png({ compressionLevel: 9 }).toBuffer();
}

async function annotateAddHome(src) {
  const box = await detectIosAddHomeRow(src);
  const meta = await sharp(src).metadata();
  const w = meta.width;
  const h = meta.height;
  const svg = rowOverlay(w, h, box.padX, box.y, box.rw, box.rh);
  return sharp(src).composite([{ input: svg, top: 0, left: 0 }]).png({ compressionLevel: 9 }).toBuffer();
}

async function annotatePlayProtect(src) {
  const box = await detectPlayProtectButton(src);
  const meta = await sharp(src).metadata();
  const w = meta.width;
  const h = meta.height;
  const svg = rowOverlay(w, h, box.padX, box.y, box.rw, box.rh);
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

const shareBuf = await annotateShare(shareSrc);
const homeBuf = await annotateAddHome(homeSrc);
const playBuf = await annotatePlayProtect(playProtectSrc);

await writePair(shareBuf, "ios-2-share.png");
await writePair(homeBuf, "ios-3-add-home.png");
await writePair(playBuf, "android-play-protect.png");

console.log("Wrote annotated install help screenshots.");
