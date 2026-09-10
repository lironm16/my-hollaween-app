import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/images/stubs");
mkdirSync(outDir, { recursive: true });

const STUB_THEMES = [
  {
    file: "pumpkin-porch.jpg",
    label: "דלעות במדרגות",
    bg: ["#12081a", "#3b1a12"],
    accent: "#fb923c",
    art: `
      <rect x="90" y="300" width="320" height="24" rx="6" fill="#4b5563"/>
      <ellipse cx="170" cy="285" rx="58" ry="50" fill="#ea580c"/>
      <polygon points="170,235 188,255 152,255" fill="#14532d"/>
      <polygon points="145,270 195,270 182,295 158,295" fill="#fde047" opacity="0.95"/>
      <ellipse cx="285" cy="290" rx="52" ry="46" fill="#f97316"/>
      <polygon points="285,244 300,262 270,262" fill="#166534"/>
      <path d="M255 285 Q285 305 315 285" stroke="#fde047" stroke-width="8" fill="none"/>
      <rect x="210" y="170" width="90" height="130" rx="6" fill="#312e81"/>
      <rect x="235" y="205" width="40" height="55" rx="4" fill="#fde68a" opacity="0.35"/>
    `,
  },
  {
    file: "purple-lights.jpg",
    label: "אורות סגולים",
    bg: ["#0f0518", "#2e1065"],
    accent: "#c084fc",
    art: `
      <rect x="120" y="180" width="260" height="170" rx="8" fill="#1e1b4b"/>
      <rect x="150" y="220" width="70" height="90" rx="4" fill="#4c1d95" opacity="0.7"/>
      <rect x="280" y="220" width="70" height="90" rx="4" fill="#4c1d95" opacity="0.7"/>
      <circle cx="110" cy="210" r="5" fill="#e9d5ff"/><circle cx="130" cy="190" r="4" fill="#d8b4fe"/>
      <circle cx="390" cy="205" r="5" fill="#e9d5ff"/><circle cx="370" cy="185" r="4" fill="#d8b4fe"/>
      <circle cx="200" cy="160" r="4" fill="#f0abfc"/><circle cx="250" cy="150" r="5" fill="#e879f9"/>
      <circle cx="300" cy="160" r="4" fill="#f0abfc"/><circle cx="350" cy="175" r="5" fill="#e879f9"/>
      <ellipse cx="250" cy="320" rx="70" ry="18" fill="#581c87" opacity="0.8"/>
    `,
  },
  {
    file: "skeleton-yard.jpg",
    label: "שלדים בחצר",
    bg: ["#111827", "#1f2937"],
    accent: "#e5e7eb",
    art: `
      <ellipse cx="250" cy="330" rx="150" ry="24" fill="#374151"/>
      <circle cx="250" cy="170" r="34" fill="#f3f4f6"/>
      <circle cx="238" cy="165" r="5" fill="#111827"/><circle cx="262" cy="165" r="5" fill="#111827"/>
      <rect x="236" y="200" width="28" height="70" rx="8" fill="#f3f4f6"/>
      <rect x="200" y="210" width="55" height="12" rx="6" fill="#f3f4f6" transform="rotate(-28 200 210)"/>
      <rect x="295" y="210" width="55" height="12" rx="6" fill="#f3f4f6" transform="rotate(28 295 210)"/>
      <rect x="220" y="265" width="18" height="70" rx="6" fill="#f3f4f6"/>
      <rect x="262" y="265" width="18" height="70" rx="6" fill="#f3f4f6"/>
      <ellipse cx="120" cy="300" rx="26" ry="22" fill="#f97316" opacity="0.8"/>
    `,
  },
  {
    file: "spider-door.jpg",
    label: "עכבישים בדלת",
    bg: ["#1a1024", "#312e81"],
    accent: "#a78bfa",
    art: `
      <rect x="165" y="120" width="170" height="220" rx="8" fill="#312e81"/>
      <rect x="190" y="150" width="120" height="150" rx="4" fill="#1e1b4b"/>
      <path d="M190 150 Q250 210 310 150 M190 180 Q250 240 310 180 M190 210 Q250 270 310 210" stroke="#cbd5e1" stroke-width="2" fill="none" opacity="0.7"/>
      <circle cx="250" cy="205" r="20" fill="#111827"/>
      <line x1="250" y1="185" x2="250" y2="150" stroke="#111827" stroke-width="3"/>
      <line x1="250" y1="225" x2="250" y2="260" stroke="#111827" stroke-width="3"/>
      <line x1="230" y1="205" x2="200" y2="205" stroke="#111827" stroke-width="3"/>
      <line x1="270" y1="205" x2="300" y2="205" stroke="#111827" stroke-width="3"/>
      <path d="M120 120 Q250 80 380 120" stroke="#94a3b8" stroke-width="2" fill="none" opacity="0.5"/>
    `,
  },
  {
    file: "graveyard-lawn.jpg",
    label: "בית עם קברים",
    bg: ["#0b1220", "#1e293b"],
    accent: "#94a3b8",
    art: `
      <rect x="130" y="250" width="240" height="8" fill="#475569"/>
      <path d="M160 250 L170 190 L190 190 L200 250 Z" fill="#64748b"/>
      <text x="175" y="225" fill="#cbd5e1" font-size="14" font-family="sans-serif">RIP</text>
      <path d="M290 250 L300 185 L320 185 L330 250 Z" fill="#64748b"/>
      <ellipse cx="250" cy="300" rx="120" ry="20" fill="#14532d" opacity="0.7"/>
      <circle cx="90" cy="120" r="28" fill="#fde68a" opacity="0.9"/>
      <path d="M70 95 Q90 70 110 95" fill="#fde68a" opacity="0.35"/>
    `,
  },
  {
    file: "witch-cauldron.jpg",
    label: "מכשפה וקדרה",
    bg: ["#1a0f24", "#3f1d56"],
    accent: "#84cc16",
    art: `
      <ellipse cx="250" cy="300" rx="95" ry="28" fill="#111827"/>
      <path d="M205 300 Q205 230 250 220 Q295 230 295 300 Z" fill="#1f2937"/>
      <ellipse cx="250" cy="225" rx="70" ry="18" fill="#14532d" opacity="0.9"/>
      <circle cx="235" cy="220" r="6" fill="#86efac"/><circle cx="260" cy="215" r="5" fill="#4ade80"/>
      <path d="M170 180 Q210 120 250 140 Q290 120 330 180" fill="#4c1d95"/>
      <circle cx="250" cy="155" r="22" fill="#fca5a5"/>
      <path d="M235 150 L240 135 L255 150" fill="#14532d"/>
    `,
  },
  {
    file: "candy-bowl.jpg",
    label: "קערת ממתקים",
    bg: ["#1c0f14", "#4a1942"],
    accent: "#f472b6",
    art: `
      <ellipse cx="250" cy="285" rx="110" ry="30" fill="#312e81"/>
      <ellipse cx="250" cy="270" rx="95" ry="22" fill="#4c1d95"/>
      <rect x="205" y="250" width="18" height="28" rx="4" fill="#f97316" transform="rotate(-15 205 250)"/>
      <rect x="235" y="245" width="16" height="26" rx="4" fill="#facc15" transform="rotate(8 235 245)"/>
      <rect x="265" y="248" width="18" height="28" rx="4" fill="#22c55e" transform="rotate(-8 265 248)"/>
      <rect x="290" y="252" width="16" height="24" rx="4" fill="#ef4444" transform="rotate(12 290 252)"/>
      <rect x="180" y="170" width="140" height="90" rx="6" fill="#5b21b6" opacity="0.8"/>
      <circle cx="250" cy="150" r="30" fill="#fb923c"/>
      <polygon points="250,120 262,140 238,140" fill="#166534"/>
    `,
  },
  {
    file: "green-monster.jpg",
    label: "מפלצת ירוקה",
    bg: ["#052e16", "#14532d"],
    accent: "#4ade80",
    art: `
      <rect x="150" y="210" width="200" height="110" rx="12" fill="#166534"/>
      <ellipse cx="250" cy="170" rx="75" ry="65" fill="#22c55e"/>
      <circle cx="220" cy="160" r="14" fill="#f8fafc"/><circle cx="280" cy="160" r="14" fill="#f8fafc"/>
      <circle cx="220" cy="160" r="6" fill="#111827"/><circle cx="280" cy="160" r="6" fill="#111827"/>
      <rect x="215" y="190" width="70" height="12" rx="4" fill="#14532d"/>
      <rect x="200" y="195" width="12" height="18" rx="3" fill="#f8fafc"/>
      <rect x="288" y="195" width="12" height="18" rx="3" fill="#f8fafc"/>
      <path d="M170 120 L190 80 L210 120 Z" fill="#22c55e"/>
      <path d="M290 120 L310 80 L330 120 Z" fill="#22c55e"/>
    `,
  },
  {
    file: "ghost-trees.jpg",
    label: "רוחות בעצים",
    bg: ["#0f172a", "#1e293b"],
    accent: "#e2e8f0",
    art: `
      <rect x="70" y="250" width="28" height="110" fill="#334155"/>
      <rect x="360" y="240" width="32" height="120" fill="#334155"/>
      <ellipse cx="250" cy="210" rx="48" ry="58" fill="#f8fafc" opacity="0.92"/>
      <path d="M205 250 Q225 235 245 250 Q265 235 285 250 Q305 235 325 250 L325 290 Q250 310 205 290 Z" fill="#f8fafc" opacity="0.92"/>
      <circle cx="232" cy="200" r="6" fill="#111827"/><circle cx="268" cy="200" r="6" fill="#111827"/>
      <ellipse cx="120" cy="255" rx="34" ry="42" fill="#f8fafc" opacity="0.55"/>
      <ellipse cx="360" cy="260" rx="30" ry="38" fill="#f8fafc" opacity="0.45"/>
    `,
  },
  {
    file: "lantern-path.jpg",
    label: "שביל דלעות",
    bg: ["#1c0a05", "#431407"],
    accent: "#fdba74",
    art: `
      <path d="M120 340 Q250 300 380 340" stroke="#78350f" stroke-width="36" fill="none" opacity="0.5"/>
      <ellipse cx="160" cy="300" rx="28" ry="24" fill="#ea580c"/><polygon points="160,276 170,288 150,288" fill="#14532d"/>
      <polygon points="148,295 172,295 166,310 154,310" fill="#fde047"/>
      <ellipse cx="250" cy="285" rx="32" ry="28" fill="#f97316"/><polygon points="250,257 262,272 238,272" fill="#166534"/>
      <polygon points="235,280 265,280 258,298 242,298" fill="#fde047"/>
      <ellipse cx="340" cy="300" rx="28" ry="24" fill="#ea580c"/><polygon points="340,276 350,288 330,288" fill="#14532d"/>
      <polygon points="328,295 352,295 346,310 334,310" fill="#fde047"/>
    `,
  },
  {
    file: "black-cat.jpg",
    label: "חתול שחור",
    bg: ["#111827", "#312e81"],
    accent: "#fbbf24",
    art: `
      <circle cx="320" cy="120" r="36" fill="#fde68a"/>
      <rect x="150" y="190" width="200" height="120" rx="8" fill="#4c1d95"/>
      <ellipse cx="250" cy="285" rx="70" ry="22" fill="#111827"/>
      <path d="M210 285 Q230 230 250 245 Q270 230 290 285 Q270 310 230 310 Q210 300 210 285 Z" fill="#111827"/>
      <polygon points="220,250 210,225 235,240" fill="#111827"/>
      <polygon points="280,250 290,225 265,240" fill="#111827"/>
      <circle cx="235" cy="265" r="5" fill="#facc15"/><circle cx="265" cy="265" r="5" fill="#facc15"/>
      <path d="M248 278 Q250 285 252 278" stroke="#f472b6" stroke-width="2" fill="none"/>
      <ellipse cx="120" cy="300" rx="26" ry="22" fill="#f97316" opacity="0.85"/>
    `,
  },
  {
    file: "bats-moon.jpg",
    label: "עטלפים וירח",
    bg: ["#020617", "#1e1b4b"],
    accent: "#fde68a",
    art: `
      <circle cx="250" cy="130" r="48" fill="#fef3c7" opacity="0.95"/>
      <path d="M120 180 Q140 160 160 180 Q140 200 120 180 Z" fill="#111827"/>
      <path d="M160 170 Q180 150 200 170 Q180 190 160 170 Z" fill="#111827"/>
      <path d="M300 165 Q320 145 340 165 Q320 185 300 165 Z" fill="#111827"/>
      <path d="M340 190 Q360 170 380 190 Q360 210 340 190 Z" fill="#111827"/>
      <rect x="170" y="230" width="160" height="100" rx="6" fill="#312e81"/>
      <rect x="205" y="260" width="90" height="55" rx="4" fill="#fde68a" opacity="0.25"/>
      <ellipse cx="250" cy="320" rx="90" ry="16" fill="#14532d" opacity="0.6"/>
    `,
  },
];

function svgForTheme(theme) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 500 400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.bg[0]}"/>
      <stop offset="100%" stop-color="${theme.bg[1]}"/>
    </linearGradient>
  </defs>
  <rect width="500" height="400" fill="url(#bg)"/>
  ${theme.art}
  <text x="250" y="372" text-anchor="middle" fill="${theme.accent}" font-size="18" font-family="Rubik, Arial, sans-serif" opacity="0.9">${theme.label}</text>
</svg>`;
}

async function main() {
  for (const theme of STUB_THEMES) {
    const out = join(outDir, theme.file);
    await sharp(Buffer.from(svgForTheme(theme)))
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(out);
    console.log("wrote", out);
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
