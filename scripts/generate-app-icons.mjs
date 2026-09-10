/**
 * PWA / home-screen icons — Android maskable + cute iOS apple-touch set.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const BG = "#12081a";

function wrapIcon(size, scale, innerSvg) {
  const s = size * scale;
  const x = (size - s) / 2;
  const y = (size - s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <g transform="translate(${x} ${y}) scale(${s / 512})">${innerSvg}</g>
</svg>`;
}

const ANDROID_PUMPKIN = `
  <defs>
    <radialGradient id="shade" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#fb923c"/>
      <stop offset="100%" stop-color="#c2410c"/>
    </radialGradient>
  </defs>
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
`;

/** Round eyes, soft smile — tuned for iOS home-screen rounding. */
const IOS_PUMPKIN = `
  <defs>
    <radialGradient id="iosBody" cx="42%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#fdba74"/>
      <stop offset="55%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#c2410c"/>
    </radialGradient>
    <radialGradient id="iosGlow" cx="50%" cy="88%" r="55%">
      <stop offset="0%" stop-color="#fb923c" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#12081a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="256" cy="300" rx="188" ry="176" fill="url(#iosBody)"/>
  <ellipse cx="256" cy="330" rx="150" ry="90" fill="url(#iosGlow)"/>
  <path d="M120 285 Q256 455 392 285" fill="none" stroke="#ea580c" stroke-width="8" opacity="0.22"/>
  <path d="M188 108 Q256 62 324 108 Q308 78 256 58 Q204 78 188 108" fill="#166534"/>
  <path d="M244 58 Q256 42 268 58 L262 88 Q256 74 250 88 Z" fill="#15803d"/>
  <ellipse cx="214" cy="118" rx="28" ry="14" fill="#22c55e" transform="rotate(-28 214 118)"/>
  <circle cx="198" cy="278" r="22" fill="#fb7185" opacity="0.35"/>
  <circle cx="314" cy="278" r="22" fill="#fb7185" opacity="0.35"/>
  <ellipse cx="200" cy="262" rx="46" ry="52" fill="#fff7ed"/>
  <ellipse cx="312" cy="262" rx="46" ry="52" fill="#fff7ed"/>
  <circle cx="212" cy="272" r="20" fill="#431407"/>
  <circle cx="324" cy="272" r="20" fill="#431407"/>
  <circle cx="218" cy="266" r="7" fill="#fff"/>
  <circle cx="330" cy="266" r="7" fill="#fff"/>
  <path d="M210 328 Q256 358 302 328 Q256 346 210 328" fill="#7c2d12" opacity="0.85"/>
  <path d="M222 330 Q256 352 290 330" fill="none" stroke="#fde68a" stroke-width="5" stroke-linecap="round"/>
  <circle cx="132" cy="132" r="4" fill="#fde68a" opacity="0.7"/>
  <circle cx="380" cy="148" r="3" fill="#fde68a" opacity="0.55"/>
  <circle cx="368" cy="396" r="3.5" fill="#c4b5fd" opacity="0.5"/>
`;

function androidSvg(size, scale) {
  return wrapIcon(size, scale, ANDROID_PUMPKIN);
}

function iosSvg(size, scale) {
  return wrapIcon(size, scale, IOS_PUMPKIN);
}

async function writeSvg(svg, name) {
  await sharp(Buffer.from(svg)).png().toFile(join(publicDir, name));
  console.log(`wrote ${name}`);
}

await writeSvg(androidSvg(512, 0.82), "icon-512.png");
await writeSvg(androidSvg(192, 0.82), "icon-192.png");
await writeSvg(androidSvg(512, 0.7), "icon-512-maskable.png");
await writeSvg(androidSvg(192, 0.7), "icon-192-maskable.png");

await writeSvg(iosSvg(180, 0.88), "apple-touch-icon.png");
await writeSvg(iosSvg(167, 0.88), "apple-touch-icon-167.png");
await writeSvg(iosSvg(152, 0.88), "apple-touch-icon-152.png");
await writeSvg(iosSvg(512, 0.88), "icon-ios-512.png");
await writeSvg(iosSvg(192, 0.88), "icon-ios-192.png");

writeFileSync(join(publicDir, "icon-source.svg"), androidSvg(512, 0.82));
writeFileSync(join(publicDir, "icon-ios-source.svg"), iosSvg(512, 0.88));
