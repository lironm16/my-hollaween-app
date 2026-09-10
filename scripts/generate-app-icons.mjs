/**
 * PWA icons for Android adaptive / maskable launchers.
 * Flat #12081a bleed + centered pumpkin (no white launcher circle).
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const BG = "#12081a";

function pumpkinSvg(size, scale) {
  const s = size * scale;
  const x = (size - s) / 2;
  const y = (size - s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <g transform="translate(${x} ${y}) scale(${s / 512})">
    <ellipse cx="256" cy="290" rx="200" ry="185" fill="#f97316"/>
    <ellipse cx="256" cy="290" rx="200" ry="185" fill="url(#shade)"/>
    <path d="M156 180 Q256 120 356 180 Q340 130 256 95 Q172 130 156 180" fill="#7c2d12"/>
    <path d="M196 95 Q256 55 316 95 L306 118 Q256 88 206 118 Z" fill="#5c1f0c"/>
    <path d="M120 290 Q256 470 392 290" fill="none" stroke="#c2410c" stroke-width="10" opacity="0.35"/>
    <path d="M170 210 L210 250 L190 175 Z" fill="#fde047"/>
    <path d="M302 210 L342 250 L322 175 Z" fill="#fde047"/>
    <path d="M236 268 L256 308 L276 268 Z" fill="#fde047"/>
    <path d="M188 330 Q256 390 324 330 Q300 360 256 368 Q212 360 188 330 Z" fill="#fde047"/>
    <ellipse cx="256" cy="300" rx="175" ry="160" fill="none" stroke="#ea580c" stroke-width="6" opacity="0.25"/>
  </g>
  <defs>
    <radialGradient id="shade" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#fb923c"/>
      <stop offset="100%" stop-color="#c2410c"/>
    </radialGradient>
  </defs>
</svg>`;
}

async function writeIcon(size, scale, name) {
  const svg = pumpkinSvg(size, scale);
  const out = join(publicDir, name);
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log(`wrote ${name} (${size}px, scale ${scale})`);
}

await writeIcon(512, 0.82, "icon-512.png");
await writeIcon(192, 0.82, "icon-192.png");
await writeIcon(512, 0.7, "icon-512-maskable.png");
await writeIcon(192, 0.7, "icon-192-maskable.png");

// Keep a regen source for designers — flat SVG at 512.
writeFileSync(join(publicDir, "icon-source.svg"), pumpkinSvg(512, 0.82));
