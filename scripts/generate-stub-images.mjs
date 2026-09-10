import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/images/stubs");
mkdirSync(outDir, { recursive: true });

const W = 960;
const H = 640;

const STUB_THEMES = [
  { file: "pumpkin-porch.jpg", scene: "pumpkinPorch" },
  { file: "purple-lights.jpg", scene: "purpleLights" },
  { file: "skeleton-yard.jpg", scene: "skeletonYard" },
  { file: "spider-door.jpg", scene: "spiderDoor" },
  { file: "graveyard-lawn.jpg", scene: "graveyardLawn" },
  { file: "witch-cauldron.jpg", scene: "witchCauldron" },
  { file: "candy-bowl.jpg", scene: "candyBowl" },
  { file: "green-monster.jpg", scene: "greenMonster" },
  { file: "ghost-trees.jpg", scene: "ghostTrees" },
  { file: "lantern-path.jpg", scene: "lanternPath" },
  { file: "black-cat.jpg", scene: "blackCat" },
  { file: "bats-moon.jpg", scene: "batsMoon" },
];

function defs() {
  return `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0c1224"/>
      <stop offset="55%" stop-color="#1a1030"/>
      <stop offset="100%" stop-color="#2a1420"/>
    </linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a3d2a"/>
      <stop offset="100%" stop-color="#0d1f14"/>
    </linearGradient>
    <radialGradient id="moonGlow" cx="50%" cy="30%" r="45%">
      <stop offset="0%" stop-color="#fff7d6" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#fff7d6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="windowGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffd89a"/>
      <stop offset="100%" stop-color="#ff9f3f" stop-opacity="0"/>
    </radialGradient>
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.45"/>
    </filter>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;
}

function stars(count = 42) {
  let out = "";
  const pts = [
    [80, 48], [140, 72], [220, 35], [310, 58], [400, 28], [490, 52], [560, 38], [640, 65], [720, 42], [820, 55],
    [95, 110], [175, 95], [265, 118], [355, 88], [445, 102], [535, 78], [625, 108], [715, 92], [805, 115],
    [120, 145], [210, 132], [300, 155], [390, 128], [480, 148], [570, 135], [660, 158], [750, 125], [840, 140],
  ];
  for (let i = 0; i < count; i++) {
    const [x, y] = pts[i % pts.length];
    const jx = x + (i % 5) * 3;
    const jy = y + (i % 7) * 2;
    const r = 1 + (i % 3) * 0.4;
    const o = 0.35 + (i % 4) * 0.15;
    out += `<circle cx="${jx}" cy="${jy}" r="${r}" fill="#fff" opacity="${o}"/>`;
  }
  return out;
}

function moon(cx = 760, cy = 110, r = 52) {
  return `
    <circle cx="${cx}" cy="${cy}" r="${r + 28}" fill="url(#moonGlow)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff4cc"/>
    <circle cx="${cx - 14}" cy="${cy - 10}" r="${r - 8}" fill="#ffe9a8" opacity="0.55"/>
  `;
}

function house(x, y, w, h, opts = {}) {
  const roof = opts.roof ?? "#2a1638";
  const wall = opts.wall ?? "#3d2554";
  const door = opts.door ?? "#5c2f14";
  const win = opts.window ?? "#ffd080";
  const wx = x + w * 0.32;
  const wy = y + h * 0.28;
  const ww = w * 0.18;
  const wh = h * 0.22;
  return `
    <g filter="url(#softShadow)">
      <polygon points="${x},${y + h * 0.35} ${x + w / 2},${y} ${x + w},${y + h * 0.35}" fill="${roof}"/>
      <rect x="${x}" y="${y + h * 0.35}" width="${w}" height="${h * 0.65}" rx="4" fill="${wall}"/>
      <rect x="${x + w * 0.38}" y="${y + h * 0.62}" width="${w * 0.24}" height="${h * 0.33}" rx="3" fill="${door}"/>
      <circle cx="${x + w * 0.5}" cy="${y + h * 0.78}" r="3" fill="#fbbf24"/>
      <rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="2" fill="#1a1028"/>
      <rect x="${wx + 3}" y="${wy + 3}" width="${ww - 6}" height="${wh - 6}" rx="1" fill="${win}" opacity="0.95"/>
      <rect x="${x + w * 0.58}" y="${wy}" width="${ww}" height="${wh}" rx="2" fill="#1a1028"/>
      <rect x="${x + w * 0.58 + 3}" y="${wy + 3}" width="${ww - 6}" height="${wh - 6}" rx="1" fill="${win}" opacity="0.75"/>
    </g>
    <ellipse cx="${x + w / 2}" cy="${y + h + 8}" rx="${w * 0.55}" ry="14" fill="#000" opacity="0.25"/>
  `;
}

function pumpkin(cx, cy, scale = 1, face = "happy") {
  const s = scale;
  const faces = {
    happy: `<polygon points="${cx - 18 * s},${cy + 8 * s} ${cx - 6 * s},${cy + 22 * s} ${cx + 6 * s},${cy + 22 * s} ${cx + 18 * s},${cy + 8 * s}" fill="#3b0f00" opacity="0.85"/>
      <polygon points="${cx - 10 * s},${cy - 4 * s} ${cx - 2 * s},${cy + 4 * s} ${cx - 14 * s},${cy + 4 * s}" fill="#3b0f00"/>
      <polygon points="${cx + 10 * s},${cy - 4 * s} ${cx + 14 * s},${cy + 4 * s} ${cx + 2 * s},${cy + 4 * s}" fill="#3b0f00"/>`,
    grin: `<path d="M ${cx - 20 * s} ${cy + 6 * s} Q ${cx} ${cy + 28 * s} ${cx + 20 * s} ${cy + 6 * s}" stroke="#3b0f00" stroke-width="${5 * s}" fill="none"/>`,
    spooky: `<polygon points="${cx - 16 * s},${cy + 10 * s} ${cx} ${cy + 26 * s} ${cx + 16 * s},${cy + 10 * s}" fill="#3b0f00"/>`,
  };
  return `
    <g filter="url(#softShadow)">
      <ellipse cx="${cx}" cy="${cy + 10 * s}" rx="${38 * s}" ry="${32 * s}" fill="#c2410c"/>
      <ellipse cx="${cx}" cy="${cy + 6 * s}" rx="${34 * s}" ry="${28 * s}" fill="#ea580c"/>
      <ellipse cx="${cx - 8 * s}" cy="${cy + 2 * s}" rx="${10 * s}" ry="${14 * s}" fill="#fb923c" opacity="0.45"/>
      <path d="M ${cx - 4 * s} ${cy - 22 * s} L ${cx + 2 * s} ${cy - 34 * s} L ${cx + 10 * s} ${cy - 22 * s} Z" fill="#166534"/>
      <rect x="${cx - 2 * s}" y="${cy - 34 * s}" width="${4 * s}" height="${8 * s}" fill="#14532d"/>
      ${faces[face] ?? faces.happy}
    </g>
  `;
}

function porchSteps(x, y, w, steps = 3) {
  let out = "";
  for (let i = 0; i < steps; i++) {
    const sy = y + i * 18;
    out += `<rect x="${x - i * 12}" y="${sy}" width="${w + i * 24}" height="16" rx="2" fill="#4b5563" opacity="${0.85 - i * 0.08}"/>`;
  }
  return out;
}

function stringLights(y, colors) {
  let out = `<path d="M 60 ${y} Q 480 ${y - 40} 900 ${y}" stroke="#374151" stroke-width="2" fill="none" opacity="0.6"/>`;
  for (let i = 0; i < 18; i++) {
    const x = 80 + i * 46;
    const c = colors[i % colors.length];
    const dy = Math.sin(i * 0.8) * 8;
    out += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 22 + dy}" stroke="#6b7280" stroke-width="1.5"/>`;
    out += `<ellipse cx="${x}" cy="${y + 28 + dy}" rx="7" ry="11" fill="${c}" filter="url(#glow)"/>`;
  }
  return out;
}

function ghost(cx, cy, scale = 1, opacity = 0.88) {
  const s = scale;
  return `
    <g opacity="${opacity}" filter="url(#softShadow)">
      <ellipse cx="${cx}" cy="${cy}" rx="${34 * s}" ry="${40 * s}" fill="#f8fafc"/>
      <path d="M ${cx - 34 * s} ${cy + 10 * s} Q ${cx - 20 * s} ${cy + 55 * s} ${cx - 10 * s} ${cy + 38 * s} Q ${cx} ${cy + 58 * s} ${cx + 10 * s} ${cy + 38 * s} Q ${cx + 20 * s} ${cy + 55 * s} ${cx + 34 * s} ${cy + 10 * s} Z" fill="#f8fafc"/>
      <circle cx="${cx - 10 * s}" cy="${cy - 4 * s}" r="${5 * s}" fill="#1e293b"/>
      <circle cx="${cx + 10 * s}" cy="${cy - 4 * s}" r="${5 * s}" fill="#1e293b"/>
      <ellipse cx="${cx}" cy="${cy + 8 * s}" rx="${5 * s}" ry="${3 * s}" fill="#cbd5e1"/>
    </g>
  `;
}

function bat(x, y, scale = 1) {
  const s = scale;
  return `<path d="M ${x} ${y} Q ${x - 18 * s} ${y - 8 * s} ${x - 28 * s} ${y + 4 * s} Q ${x - 12 * s} ${y + 2 * s} ${x} ${y + 10 * s} Q ${x + 12 * s} ${y + 2 * s} ${x + 28 * s} ${y + 4 * s} Q ${x + 18 * s} ${y - 8 * s} ${x} ${y} Z" fill="#0f172a" opacity="0.85"/>`;
}

function tree(x, y, h) {
  return `
    <rect x="${x}" y="${y}" width="16" height="${h}" fill="#3f2e1f"/>
    <ellipse cx="${x + 8}" cy="${y - 10}" rx="42" ry="48" fill="#1f3d2c" opacity="0.9"/>
    <ellipse cx="${x + 8}" cy="${y - 28}" rx="34" ry="38" fill="#14532d" opacity="0.85"/>
  `;
}

function tombstone(x, y, w, h, label = "") {
  return `
    <path d="M ${x} ${y + h} L ${x} ${y + h * 0.25} Q ${x} ${y} ${x + w / 2} ${y} Q ${x + w} ${y} ${x + w} ${y + h * 0.25} L ${x + w} ${y + h} Z" fill="#64748b" filter="url(#softShadow)"/>
    ${label ? `<text x="${x + w / 2}" y="${y + h * 0.55}" text-anchor="middle" fill="#cbd5e1" font-size="13" font-family="Georgia, serif">${label}</text>` : ""}
  `;
}

const SCENES = {
  pumpkinPorch() {
    return `
      ${moon(780, 95, 46)}
      ${house(300, 180, 360, 260)}
      ${porchSteps(380, 430, 200, 4)}
      ${pumpkin(340, 400, 1.05, "happy")}
      ${pumpkin(430, 415, 0.92, "grin")}
      ${pumpkin(520, 400, 1.1, "spooky")}
      ${pumpkin(610, 418, 0.88, "happy")}
      <ellipse cx="480" cy="520" rx="280" ry="40" fill="#000" opacity="0.2"/>
    `;
  },
  purpleLights() {
    return `
      ${moon(120, 100, 40)}
      ${house(280, 160, 400, 280, { wall: "#2e1a45", roof: "#1a0f28" })}
      ${stringLights(175, ["#c084fc", "#e879f9", "#a78bfa", "#f0abfc", "#d8b4fe"])}
      ${pumpkin(250, 430, 0.75, "happy")}
      ${pumpkin(700, 435, 0.7, "grin")}
    `;
  },
  skeletonYard() {
    return `
      ${moon(740, 88, 44)}
      ${house(310, 190, 340, 240)}
      <g filter="url(#softShadow)">
        <circle cx="480" cy="300" r="28" fill="#f1f5f9"/>
        <rect x="466" y="325" width="28" height="70" rx="8" fill="#f1f5f9"/>
        <rect x="430" y="340" width="50" height="10" rx="5" fill="#f1f5f9" transform="rotate(-25 430 340)"/>
        <rect x="500" y="340" width="50" height="10" rx="5" fill="#f1f5f9" transform="rotate(25 500 340)"/>
        <rect x="452" y="390" width="12" height="55" rx="5" fill="#f1f5f9"/>
        <rect x="496" y="390" width="12" height="55" rx="5" fill="#f1f5f9"/>
      </g>
      ${pumpkin(300, 430, 0.8, "grin")}
      ${pumpkin(650, 425, 0.85, "happy")}
    `;
  },
  spiderDoor() {
    return `
      ${moon(700, 105, 42)}
      ${house(290, 150, 380, 300, { door: "#3f1d56" })}
      <path d="M 200 120 Q 480 40 760 120" stroke="#94a3b8" stroke-width="1.5" fill="none" opacity="0.35"/>
      <g opacity="0.5">
        <line x1="480" y1="60" x2="480" y2="340" stroke="#94a3b8" stroke-width="1"/>
        <line x1="380" y1="120" x2="580" y2="320" stroke="#94a3b8" stroke-width="1"/>
        <line x1="580" y1="120" x2="380" y2="320" stroke="#94a3b8" stroke-width="1"/>
      </g>
      <circle cx="480" cy="330" r="22" fill="#111827" filter="url(#softShadow)"/>
      <circle cx="472" cy="324" r="3" fill="#ef4444"/><circle cx="488" cy="324" r="3" fill="#ef4444"/>
      ${pumpkin(250, 440, 0.7, "spooky")}
      ${pumpkin(700, 445, 0.75, "happy")}
    `;
  },
  graveyardLawn() {
    return `
      ${moon(150, 90, 50)}
      ${house(340, 200, 280, 220)}
      ${tombstone(220, 360, 50, 70, "RIP")}
      ${tombstone(300, 375, 42, 58)}
      ${tombstone(620, 365, 55, 72, "BOO")}
      ${tombstone(700, 380, 40, 55)}
      ${ghost(180, 310, 0.65, 0.35)}
      ${pumpkin(520, 430, 0.9, "spooky")}
    `;
  },
  witchCauldron() {
    return `
      ${moon(720, 100, 48)}
      <g filter="url(#softShadow)">
        <ellipse cx="480" cy="430" rx="110" ry="28" fill="#111827"/>
        <path d="M 380 430 Q 380 330 480 310 Q 580 330 580 430 Z" fill="#1f2937"/>
        <ellipse cx="480" cy="318" rx="78" ry="20" fill="#14532d" opacity="0.95"/>
        <ellipse cx="460" cy="312" rx="16" ry="8" fill="#86efac" opacity="0.8"/>
        <ellipse cx="500" cy="308" rx="12" ry="6" fill="#4ade80" opacity="0.7"/>
      </g>
      <path d="M 400 250 Q 440 170 480 190 Q 520 170 560 250" fill="#4c1d95" filter="url(#softShadow)"/>
      <ellipse cx="480" cy="210" rx="36" ry="30" fill="#fecaca"/>
      <path d="M 460 195 L 468 170 L 485 195" fill="#14532d"/>
      ${house(180, 220, 200, 180, { wall: "#2a1638" })}
      ${pumpkin(650, 420, 0.8, "happy")}
    `;
  },
  candyBowl() {
    return `
      ${house(120, 140, 720, 320, { wall: "#3b2260", roof: "#241235" })}
      <rect x="180" y="380" width="600" height="120" rx="8" fill="#4c1d95" opacity="0.35"/>
      <ellipse cx="480" cy="400" rx="130" ry="38" fill="#312e81" filter="url(#softShadow)"/>
      <ellipse cx="480" cy="385" rx="115" ry="28" fill="#4c1d95"/>
      <ellipse cx="420" cy="375" rx="18" ry="12" fill="#f97316" transform="rotate(-20 420 375)"/>
      <ellipse cx="455" cy="368" rx="16" ry="11" fill="#facc15" transform="rotate(10 455 368)"/>
      <ellipse cx="495" cy="372" rx="17" ry="12" fill="#22c55e" transform="rotate(-8 495 372)"/>
      <ellipse cx="535" cy="378" rx="16" ry="11" fill="#ef4444" transform="rotate(15 535 378)"/>
      <ellipse cx="470" cy="390" rx="14" ry="10" fill="#a855f7" transform="rotate(-12 470 390)"/>
      ${pumpkin(480, 250, 1.2, "grin")}
      ${stringLights(130, ["#fb923c", "#facc15", "#f472b6", "#4ade80"])}
    `;
  },
  greenMonster() {
    return `
      ${moon(680, 95, 45)}
      ${house(300, 200, 360, 240)}
      <g filter="url(#softShadow)">
        <ellipse cx="480" cy="360" rx="90" ry="78" fill="#22c55e"/>
        <ellipse cx="455" cy="345" rx="22" ry="26" fill="#f8fafc"/>
        <ellipse cx="505" cy="345" rx="22" ry="26" fill="#f8fafc"/>
        <circle cx="455" cy="348" r="9" fill="#111827"/>
        <circle cx="505" cy="348" r="9" fill="#111827"/>
        <rect x="450" y="385" width="60" height="14" rx="5" fill="#14532d"/>
        <rect x="438" y="388" width="10" height="20" rx="3" fill="#f8fafc"/>
        <rect x="512" y="388" width="10" height="20" rx="3" fill="#f8fafc"/>
        <path d="M 430 280 L 450 230 L 470 280 Z" fill="#16a34a"/>
        <path d="M 490 280 L 510 230 L 530 280 Z" fill="#16a34a"/>
      </g>
      ${pumpkin(280, 440, 0.75, "happy")}
    `;
  },
  ghostTrees() {
    return `
      ${moon(480, 80, 55)}
      ${tree(100, 320, 140)}
      ${tree(780, 310, 150)}
      ${tree(650, 340, 110)}
      ${ghost(480, 280, 1.15)}
      ${ghost(250, 320, 0.75, 0.55)}
      ${ghost(720, 330, 0.7, 0.5)}
      ${house(350, 250, 220, 180, { wall: "#2a1638" })}
      ${pumpkin(400, 450, 0.7, "spooky")}
    `;
  },
  lanternPath() {
    return `
      ${moon(820, 100, 42)}
      <path d="M 100 520 Q 480 470 860 520" stroke="#78350f" stroke-width="50" fill="none" opacity="0.35"/>
      ${[200, 320, 440, 560, 720].map((x, i) => `
        <g filter="url(#glow)">
          <line x1="${x}" y1="${460 - i * 8}" x2="${x}" y2="${500 - i * 8}" stroke="#57534e" stroke-width="3"/>
          <rect x="${x - 14}" y="${410 - i * 8}" width="28" height="36" rx="4" fill="#292524"/>
          <ellipse cx="${x}" cy="${425 - i * 8}" rx="10" ry="14" fill="#fbbf24" opacity="0.95"/>
        </g>
        ${pumpkin(x - 35, 500 - i * 6, 0.55, i % 2 ? "grin" : "happy")}
      `).join("")}
      ${house(360, 170, 240, 200)}
    `;
  },
  blackCat() {
    return `
      ${moon(500, 90, 58)}
      ${house(280, 180, 400, 260)}
      <g filter="url(#softShadow)">
        <path d="M 420 430 Q 450 360 480 375 Q 510 360 540 430 Q 510 460 450 460 Q 420 450 420 430 Z" fill="#0f172a"/>
        <polygon points="440,385 430,355 455,375" fill="#0f172a"/>
        <polygon points="520,385 530,355 505,375" fill="#0f172a"/>
        <circle cx="458" cy="400" r="5" fill="#facc15"/>
        <circle cx="502" cy="400" r="5" fill="#facc15"/>
        <path d="M 478 415 Q 480 422 482 415" stroke="#f472b6" stroke-width="2" fill="none"/>
        <path d="M 430 430 Q 400 420 390 400" stroke="#0f172a" stroke-width="8" fill="none" stroke-linecap="round"/>
      </g>
      ${pumpkin(300, 440, 0.8, "happy")}
      ${pumpkin(650, 435, 0.75, "grin")}
    `;
  },
  batsMoon() {
    return `
      ${moon(480, 100, 62)}
      ${bat(200, 160, 1.2)}${bat(250, 140, 1)}${bat(700, 150, 1.1)}${bat(760, 175, 0.9)}
      ${bat(320, 120, 0.8)}${bat(620, 125, 0.85)}
      ${house(310, 220, 340, 250)}
      ${porchSteps(390, 450, 180, 3)}
      ${pumpkin(360, 420, 0.85, "spooky")}
      ${pumpkin(580, 425, 0.9, "happy")}
    `;
  },
};

function svgForTheme(theme) {
  const scene = SCENES[theme.scene]();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs()}
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  ${stars()}
  <rect x="0" y="${H * 0.72}" width="${W}" height="${H * 0.28}" fill="url(#ground)"/>
  ${scene}
  <rect width="${W}" height="${H}" fill="url(#moonGlow)" opacity="0.15"/>
  <rect x="0" y="0" width="${W}" height="${H}" fill="#000" opacity="0.12" rx="0"/>
</svg>`;
}

async function renderTheme(theme) {
  const out = join(outDir, theme.file);
  const svg = svgForTheme(theme);
  await sharp(Buffer.from(svg))
    .resize(W, H)
    .modulate({ brightness: 1.04, saturation: 1.12 })
    .sharpen({ sigma: 0.8 })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(out);
  console.log("wrote", out);
}

async function main() {
  const forceSvg = process.argv.includes("--svg");
  if (forceSvg) {
    for (const theme of STUB_THEMES) {
      await renderTheme(theme);
    }
  } else {
    console.log("keeping existing public/images/stubs photos (pass --svg to regenerate placeholders)");
  }

  const seedPath = join(root, "data/seed.json");
  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  let index = 0;
  for (const house of seed.houses) {
    if (!house.description?.includes("סטאב לחזרה")) continue;
    const theme = STUB_THEMES[index % STUB_THEMES.length];
    house.photoUrl = `/images/stubs/${theme.file}`;
    index += 1;
  }
  writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);
  console.log(`updated ${index} stub houses in data/seed.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
