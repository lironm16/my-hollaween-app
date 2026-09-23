/**
 * POI map pin faces — white jack-o'-lantern on transparent (orange pin circle shows through).
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/icons");

const INK = "#1c0e24";
const BODY = "#fff7ed";

const MOUTHS = {
  mild: `<path fill="${INK}" d="M8.2 15.4 12 18.2l3.8-2.8-1.4.2L12 16.6l-2.4-1z"/>`,
  medium: `<path fill="${INK}" d="M7.8 14.8 12 17.8l4.2-3-1.6.4L12 16.2l-2.6-1.4z"/>`,
  spicy: `<path fill="${INK}" d="M7.4 14.2 12 18.6l4.6-4.4-1.8.6L12 16l-3.2-1.8z"/>`,
};

function pumpkinSvg(level) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24">
  <g transform="translate(12 12.5) scale(1.08) translate(-12 -12.5)">
    <path fill="${BODY}" d="M11.2 2.4h1.6c.5 0 .9.5.8 1l-.4 2.1h-2.4l-.4-2.1c-.1-.5.3-1 .8-1Z"/>
    <ellipse cx="12" cy="13.2" rx="8.4" ry="7.6" fill="${BODY}"/>
    <path fill="${INK}" d="M8.4 10.4 10.6 12 8.4 12.6zm7.2 0L13.4 12l2.2.6z"/>
    ${MOUTHS[level]}
  </g>
</svg>`;
}

for (const level of ["mild", "medium", "spicy"]) {
  const svg = pumpkinSvg(level);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const path = join(outDir, `pin-poi-${level}.png`);
  writeFileSync(path, png);
  console.log("wrote", path);
}
