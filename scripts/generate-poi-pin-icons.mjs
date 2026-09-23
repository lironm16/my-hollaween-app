/**
 * Pumpkin PNGs — badge glyphs (preview/scare #5) + large map pin faces.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/icons");

const INK = "#1c0e24";
const CREAM = "#fff7ed";
const AMBER = "#d97706";

const MOUTHS = {
  mild: `M8.2 15.4 12 18.2l3.8-2.8-1.4.2L12 16.6l-2.4-1z`,
  medium: `M7.8 14.8 12 17.8l4.2-3-1.6.4L12 16.2l-2.6-1.4z`,
  spicy: `M7.4 14.2 12 18.6l4.6-4.4-1.8.6L12 16l-3.2-1.8z`,
};

function pumpkinPaths(level, body, feature) {
  return `<path fill="${body}" d="M11.2 2.4h1.6c.5 0 .9.5.8 1l-.4 2.1h-2.4l-.4-2.1c-.1-.5.3-1 .8-1Z"/>
  <ellipse cx="12" cy="13.2" rx="8.4" ry="7.6" fill="${body}"/>
  <path fill="${feature}" d="M8.4 10.4 10.6 12 8.4 12.6zm7.2 0L13.4 12l2.2.6z"/>
  <path fill="${feature}" d="${MOUTHS[level]}"/>`;
}

function svg(content, scale = 1.08) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24">
  <g transform="translate(12 12.5) scale(${scale}) translate(-12 -12.5)">${content}</g>
</svg>`;
}

async function writePng(name, content) {
  const png = await sharp(Buffer.from(content)).png().toBuffer();
  const path = join(outDir, name);
  writeFileSync(path, png);
  console.log("wrote", path);
}

for (const level of ["mild", "medium", "spicy"]) {
  const body = level === "medium" ? INK : CREAM;
  const feature = level === "medium" ? AMBER : INK;
  await writePng(`scare-pumpkin-${level}.png`, svg(pumpkinPaths(level, body, feature), 1.12));
  await writePng(`pin-poi-${level}.png`, svg(pumpkinPaths(level, CREAM, INK), 1.28));
}
