#!/usr/bin/env node
/** Regenerate pin-school-campus-light / ink PNGs from pin-school-campus.png */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
const srcPath = join(root, "pin-school-campus.png");

async function buildVariant(name, bodyRgb, windowRgb) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const a = out[i + 3];
    if (a < 40) continue;
    const warm = out[i] + out[i + 1] > 280;
    const rgb = warm ? windowRgb : bodyRgb;
    out[i] = rgb[0];
    out[i + 1] = rgb[1];
    out[i + 2] = rgb[2];
    out[i + 3] = 255;
  }
  const base = join(root, name);
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(base);
  await sharp(base)
    .resize(info.width * 2, info.height * 2)
    .toFile(join(root, name.replace(".png", "@2x.png")));
  console.log("wrote", name);
}

await buildVariant("pin-school-campus-light.png", [255, 247, 237], [28, 25, 23]);
await buildVariant("pin-school-campus-ink.png", [255, 255, 255], [15, 15, 20]);
