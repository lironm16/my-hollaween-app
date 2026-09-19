#!/usr/bin/env node
/**
 * Regenerate help mockup SVGs with XML numeric entities for Hebrew (ASCII-safe, valid UTF-8).
 * Run: node scripts/generate-help-svgs.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "images", "help");

/** Escape non-ASCII as XML decimal entities so files stay valid UTF-8/ASCII. */
function t(text) {
  return String(text).replace(/[^\x09\x0A\x0D\x20-\x7E]/g, (ch) => `&#${ch.codePointAt(0)};`);
}

const FONT = "Rubik,Arial,sans-serif";
const BG = "#12081a";
const PANEL = "#1d1028";
const ORANGE = "#f97316";

function svg({ label, body }) {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 780" width="390" height="780" role="img" aria-label="${t(label)}">\n` +
    body +
    `\n</svg>\n`
  );
}

function header() {
  return `<rect width="390" height="780" fill="${BG}"/>
  <rect y="0" width="390" height="52" fill="#14091c"/>
  <text x="195" y="32" fill="#fb923c" font-family="${FONT}" font-size="14" font-weight="700" text-anchor="middle">HallowHood</text>`;
}

function toolbar(filterActive = false) {
  return `<rect y="52" width="390" height="48" fill="${BG}" stroke="${ORANGE}" stroke-opacity="0.15"/>
  <rect x="12" y="60" width="80" height="32" rx="8" fill="#261536"/>
  <rect x="300" y="60" width="78" height="32" rx="8" fill="${filterActive ? ORANGE : "#261536"}"/>
  <text x="339" y="81" fill="${filterActive ? "#000" : "#fdba74"}" font-family="${FONT}" font-size="13" font-weight="700" text-anchor="middle">${t("סינון")}</text>`;
}

function write(rel, content) {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  // validate
  const buf = Buffer.from(content, "utf8");
  if (buf.toString("utf8") !== content) throw new Error(`Invalid UTF-8: ${rel}`);
  if (!content.includes('xmlns="http://www.w3.org/2000/svg"')) throw new Error(`Bad SVG: ${rel}`);
}

const files = {
  "step-1-menu.svg": svg({
    label: "תפריט עם כפתור הוספה",
    body: `${header()}
  <rect x="0" y="52" width="280" height="728" fill="#0f0814" fill-opacity="0.95"/>
  <text x="240" y="100" fill="#fdba74" font-family="${FONT}" font-size="20" font-weight="700" text-anchor="end">${t("תפריט")}</text>
  <text x="240" y="150" fill="#fde68a" font-family="${FONT}" font-size="18" text-anchor="end">${t("בית")}</text>
  <text x="240" y="195" fill="#fde68a" font-family="${FONT}" font-size="18" text-anchor="end">${t("עזרה")}</text>
  <rect x="40" y="220" width="200" height="36" rx="8" fill="${ORANGE}" fill-opacity="0.15"/>
  <text x="240" y="244" fill="#fb923c" font-family="${FONT}" font-size="18" font-weight="700" text-anchor="end">${t("הוספה")}</text>
  <path d="M260 280 L310 280" stroke="#a78bfa" stroke-width="2" marker-end="url(#a)"/>
  <text x="260" y="272" fill="#c4b5fd" font-family="${FONT}" font-size="12" text-anchor="end">${t("לחצו הוספה")}</text>
  <defs><marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#a78bfa"/></marker></defs>`,
  }),

  "step-2-form.svg": svg({
    label: "שם וכתובת בטופס",
    body: `${header()}
  <rect x="24" y="80" width="342" height="600" rx="16" fill="${PANEL}" stroke="${ORANGE}" stroke-opacity="0.25"/>
  <text x="330" y="130" fill="#fdba74" font-family="${FONT}" font-size="18" font-weight="700" text-anchor="end">${t("הוספת בית")}</text>
  <text x="330" y="180" fill="#c4b5fd" font-family="${FONT}" font-size="14" text-anchor="end">${t("שם הבית")}</text>
  <rect x="40" y="190" width="310" height="36" rx="8" fill="#14081c" stroke="${ORANGE}" stroke-opacity="0.2"/>
  <text x="320" y="214" fill="#fde68a" font-family="${FONT}" font-size="14" text-anchor="end">${t("בית הדלעות")}</text>
  <text x="330" y="260" fill="#c4b5fd" font-family="${FONT}" font-size="14" text-anchor="end">${t("כתובת")}</text>
  <rect x="40" y="270" width="310" height="36" rx="8" fill="#14081c" stroke="${ORANGE}" stroke-opacity="0.2"/>
  <text x="320" y="294" fill="#fde68a" font-family="${FONT}" font-size="13" text-anchor="end">${t("רחוב 12, שכונה")}</text>`,
  }),

  "step-3-details.svg": svg({
    label: "שעות ממתקים ורמת פחד",
    body: `${header()}
  <rect x="24" y="80" width="342" height="600" rx="16" fill="${PANEL}" stroke="${ORANGE}" stroke-opacity="0.25"/>
  <text x="330" y="130" fill="#c4b5fd" font-family="${FONT}" font-size="14" text-anchor="end">${t("שעות פתיחה")}</text>
  <rect x="40" y="140" width="310" height="32" rx="8" fill="#14081c"/>
  <text x="320" y="161" fill="#fde68a" font-family="${FONT}" font-size="13" text-anchor="end">17:00 - 21:00</text>
  <text x="330" y="210" fill="#c4b5fd" font-family="${FONT}" font-size="14" text-anchor="end">${t("ממתקים")}</text>
  <rect x="40" y="220" width="100" height="28" rx="8" fill="${ORANGE}" fill-opacity="0.2"/>
  <text x="90" y="239" fill="#fde68a" font-family="${FONT}" font-size="12" text-anchor="middle">${t("הרבה")}</text>
  <text x="330" y="290" fill="#c4b5fd" font-family="${FONT}" font-size="14" text-anchor="end">${t("רמת פחד")}</text>
  <rect x="40" y="300" width="100" height="28" rx="8" fill="#7c3aed" fill-opacity="0.3"/>
  <text x="90" y="319" fill="#fde68a" font-family="${FONT}" font-size="12" text-anchor="middle">${t("קל")}</text>`,
  }),

  "step-3-done.svg": svg({
    label: "מסך הצלחה עם קוד עריכה",
    body: `${header()}
  <rect x="24" y="120" width="342" height="400" rx="16" fill="${PANEL}" stroke="${ORANGE}" stroke-opacity="0.35"/>
  <text x="195" y="200" fill="#86efac" font-family="${FONT}" font-size="40" text-anchor="middle">&#10003;</text>
  <text x="195" y="250" fill="#fdba74" font-family="${FONT}" font-size="20" font-weight="700" text-anchor="middle">${t("נשמר!")}</text>
  <text x="195" y="300" fill="#c4b5fd" font-family="${FONT}" font-size="15" text-anchor="middle">${t("קוד עריכה")}</text>
  <rect x="115" y="315" width="160" height="44" rx="10" fill="#14081c" stroke="${ORANGE}" stroke-opacity="0.4"/>
  <text x="195" y="344" fill="#fde68a" font-family="${FONT}" font-size="22" font-weight="700" text-anchor="middle" letter-spacing="4">482916</text>`,
  }),

  "share-edit-code-menu.svg": svg({
    label: "תפריט פעולות עם קוד עריכה",
    body: `${header()}
  <rect x="16" y="56" width="358" height="220" rx="16" fill="${PANEL}" stroke="${ORANGE}" stroke-opacity="0.2"/>
  <text x="320" y="88" fill="#fdba74" font-family="${FONT}" font-size="18" font-weight="700" text-anchor="end">${t("בית הדלעות")}</text>
  <rect x="36" y="98" width="28" height="28" rx="14" fill="#2a1638" stroke="${ORANGE}" stroke-opacity="0.35"/>
  <text x="50" y="117" fill="#fde68a" font-family="${FONT}" font-size="16" text-anchor="middle">&#8942;</text>
  <rect x="190" y="72" width="188" height="200" rx="14" fill="#160b20" stroke="${ORANGE}" stroke-opacity="0.35"/>
  <rect x="208" y="180" width="152" height="28" rx="8" fill="${ORANGE}" fill-opacity="0.25"/>
  <text x="284" y="199" fill="#fde68a" font-family="${FONT}" font-size="15" font-weight="700" text-anchor="middle">${t("קוד עריכה")}</text>
  <path d="M72 120 L120 120" stroke="#a78bfa" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="120" y="112" fill="#c4b5fd" font-family="${FONT}" font-size="13" text-anchor="end">${t("לחצו &#8942;")}</text>
  <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#a78bfa"/></marker></defs>`,
  }),

  "share-edit-code-dialog.svg": svg({
    label: "חלון קוד עריכה",
    body: `${header()}
  <rect x="40" y="200" width="310" height="280" rx="16" fill="${PANEL}" stroke="${ORANGE}" stroke-opacity="0.35"/>
  <text x="195" y="250" fill="#fdba74" font-family="${FONT}" font-size="18" font-weight="700" text-anchor="middle">${t("קוד עריכה")}</text>
  <text x="195" y="310" fill="#fde68a" font-family="${FONT}" font-size="28" font-weight="700" text-anchor="middle" letter-spacing="4">482916</text>
  <rect x="60" y="350" width="130" height="40" rx="10" fill="${ORANGE}"/>
  <text x="125" y="376" fill="#000" font-family="${FONT}" font-size="14" font-weight="700" text-anchor="middle">${t("העתיקו")}</text>
  <rect x="200" y="350" width="130" height="40" rx="10" fill="#261536" stroke="${ORANGE}" stroke-opacity="0.4"/>
  <text x="265" y="376" fill="#fde68a" font-family="${FONT}" font-size="14" font-weight="700" text-anchor="middle">${t("שיתוף")}</text>`,
  }),

  "route-1-filters.svg": svg({
    label: "חלון סינון בתים",
    body: `${header()}
  ${toolbar(true)}
  <rect x="24" y="130" width="342" height="520" rx="16" fill="${PANEL}" stroke="${ORANGE}" stroke-opacity="0.25"/>
  <text x="330" y="170" fill="#fdba74" font-family="${FONT}" font-size="18" font-weight="700" text-anchor="end">${t("סינון בתים")}</text>
  <text x="330" y="220" fill="#fde68a" font-family="${FONT}" font-size="15" text-anchor="end">${t("רמת פחד")}</text>
  <text x="330" y="260" fill="#fde68a" font-family="${FONT}" font-size="15" text-anchor="end">${t("ממתקים")}</text>
  <text x="330" y="300" fill="#fde68a" font-family="${FONT}" font-size="15" text-anchor="end">${t("נגישות")}</text>
  <rect x="40" y="560" width="310" height="44" rx="12" fill="${ORANGE}"/>
  <text x="195" y="588" fill="#000" font-family="${FONT}" font-size="16" font-weight="700" text-anchor="middle">${t("הצג תוצאות")}</text>`,
  }),

  "route-2-origin.svg": svg({
    label: "בחירת נקודת התחלה",
    body: `${header()}
  ${toolbar()}
  <rect x="24" y="130" width="342" height="400" rx="16" fill="${PANEL}" stroke="${ORANGE}" stroke-opacity="0.25"/>
  <text x="330" y="170" fill="#fdba74" font-family="${FONT}" font-size="18" font-weight="700" text-anchor="end">${t("נקודת התחלה")}</text>
  <rect x="40" y="200" width="310" height="40" rx="10" fill="${ORANGE}" fill-opacity="0.2"/>
  <text x="320" y="226" fill="#fde68a" font-family="${FONT}" font-size="14" text-anchor="end">${t("מיקום נוכחי")}</text>
  <text x="320" y="280" fill="#fde68a" font-family="${FONT}" font-size="14" text-anchor="end">${t("מרכז השכונה")}</text>
  <text x="320" y="330" fill="#fde68a" font-family="${FONT}" font-size="14" text-anchor="end">${t("נקודה במפה")}</text>`,
  }),

  "route-3-enable.svg": svg({
    label: "הפעלת מסלול",
    body: `${header()}
  <rect y="52" width="390" height="48" fill="${BG}"/>
  <rect x="12" y="60" width="80" height="32" rx="8" fill="#261536"/>
  <rect x="200" y="60" width="78" height="32" rx="8" fill="${ORANGE}"/>
  <text x="239" y="81" fill="#000" font-family="${FONT}" font-size="13" font-weight="700" text-anchor="middle">${t("מסלול")}</text>
  <rect x="24" y="120" width="342" height="500" rx="16" fill="#243447"/>
  <path d="M80 400 L150 320 L220 380 L300 260" stroke="${ORANGE}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="80" cy="400" r="10" fill="${ORANGE}"/>
  <circle cx="300" cy="260" r="10" fill="#fde68a"/>`,
  }),

  "route-4-summary.svg": svg({
    label: "סיכום מסלול",
    body: `${header()}
  <rect x="24" y="80" width="342" height="120" rx="12" fill="${PANEL}" stroke="${ORANGE}" stroke-opacity="0.3"/>
  <text x="330" y="120" fill="#fdba74" font-family="${FONT}" font-size="16" font-weight="700" text-anchor="end">${t("סיכום מסלול")}</text>
  <text x="330" y="155" fill="#fde68a" font-family="${FONT}" font-size="14" text-anchor="end">8 ${t("בתים")} · 2.4 ${t("ק\"מ")} · ~45 ${t("דק")}</text>
  <rect x="24" y="220" width="342" height="56" rx="10" fill="#14081c"/>
  <text x="330" y="254" fill="#fde68a" font-family="${FONT}" font-size="15" text-anchor="end">1. ${t("בית הדלעות")} · 120m</text>
  <rect x="24" y="290" width="342" height="56" rx="10" fill="#14081c"/>
  <text x="330" y="324" fill="#fde68a" font-family="${FONT}" font-size="15" text-anchor="end">2. ${t("בית הקשת")} · 85m</text>`,
  }),

  "route-during-exit.svg": svg({
    label: "מעבר בין מפה לרשימה",
    body: `${header()}
  <rect y="52" width="390" height="48" fill="${BG}"/>
  <rect x="100" y="60" width="90" height="32" rx="8" fill="${ORANGE}"/>
  <text x="145" y="81" fill="#000" font-family="${FONT}" font-size="13" font-weight="700" text-anchor="middle">${t("מפה")}</text>
  <rect x="200" y="60" width="90" height="32" rx="8" fill="#261536"/>
  <text x="245" y="81" fill="#fde68a" font-family="${FONT}" font-size="13" font-weight="700" text-anchor="middle">${t("רשימה")}</text>
  <rect x="24" y="120" width="342" height="500" rx="16" fill="#243447"/>`,
  }),

  "route-during-map.svg": svg({
    label: "קו מסלול על המפה",
    body: `${header()}
  ${toolbar()}
  <rect x="24" y="120" width="342" height="500" rx="16" fill="#243447"/>
  <path d="M60 500 L120 420 L200 460 L280 340 L330 280" stroke="${ORANGE}" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="60" cy="500" r="12" fill="${ORANGE}"/>
  <circle cx="330" cy="280" r="12" fill="#fde68a"/>
  <rect x="280" y="60" width="90" height="32" rx="8" fill="#261536"/>
  <text x="325" y="81" fill="#fde68a" font-family="${FONT}" font-size="12" font-weight="700" text-anchor="middle">${t("סיכום")}</text>`,
  }),

  "route-during-actions.svg": svg({
    label: "ביקור ודילוג",
    body: `${header()}
  <rect x="24" y="80" width="342" height="180" rx="16" fill="${PANEL}" stroke="${ORANGE}" stroke-opacity="0.25"/>
  <text x="320" y="120" fill="#fdba74" font-family="${FONT}" font-size="17" font-weight="700" text-anchor="end">${t("בית הדלעות")}</text>
  <text x="36" y="120" fill="#fde68a" font-family="${FONT}" font-size="20">&#8942;</text>
  <rect x="190" y="100" width="160" height="140" rx="12" fill="#160b20" stroke="${ORANGE}" stroke-opacity="0.35"/>
  <text x="270" y="140" fill="#86efac" font-family="${FONT}" font-size="14" text-anchor="middle">${t("ביקרתי")}</text>
  <text x="270" y="175" fill="#fde68a" font-family="${FONT}" font-size="14" text-anchor="middle">${t("דילוג")}</text>
  <text x="270" y="210" fill="#fde68a" font-family="${FONT}" font-size="14" text-anchor="middle">${t("ניווט")}</text>`,
  }),

  "filter-1-open.svg": svg({
    label: "פתיחת חלון סינון",
    body: `${header()}
  ${toolbar(true)}
  <rect x="24" y="130" width="342" height="520" rx="16" fill="${PANEL}" stroke="${ORANGE}" stroke-opacity="0.25"/>
  <text x="330" y="170" fill="#fdba74" font-family="${FONT}" font-size="18" font-weight="700" text-anchor="end">${t("סינון בתים")}</text>
  <text x="330" y="220" fill="#c4b5fd" font-family="${FONT}" font-size="15" font-weight="600" text-anchor="end">${t("שעות")}</text>
  <text x="330" y="260" fill="#fde68a" font-family="${FONT}" font-size="14" text-anchor="end">${t("כל שעה · פתוחים עכשיו · מותאם")}</text>
  <rect x="40" y="560" width="140" height="44" rx="12" fill="#261536" stroke="${ORANGE}" stroke-opacity="0.3"/>
  <text x="110" y="588" fill="#fdba74" font-family="${FONT}" font-size="15" font-weight="600" text-anchor="middle">${t("איפוס")}</text>
  <rect x="190" y="560" width="160" height="44" rx="12" fill="${ORANGE}"/>
  <text x="270" y="588" fill="#000" font-family="${FONT}" font-size="14" font-weight="700" text-anchor="middle">${t("הצג תוצאות")}</text>`,
  }),

  "filter-2-map-dim.svg": svg({
    label: "בתים מסוננים באפור על המפה",
    body: `${header()}
  <rect y="52" width="390" height="728" fill="#243447"/>
  <circle cx="120" cy="220" r="18" fill="${ORANGE}"/>
  <circle cx="260" cy="300" r="18" fill="${ORANGE}"/>
  <circle cx="180" cy="380" r="18" fill="#6b7280" opacity="0.55"/>
  <circle cx="300" cy="450" r="18" fill="#6b7280" opacity="0.55"/>
  <circle cx="90" cy="520" r="18" fill="#6b7280" opacity="0.55"/>
  <rect x="24" y="600" width="342" height="120" rx="16" fill="${BG}" fill-opacity="0.92" stroke="${ORANGE}" stroke-opacity="0.35"/>
  <text x="330" y="640" fill="#fdba74" font-family="${FONT}" font-size="16" font-weight="700" text-anchor="end">${t("במפה — שניהם")}</text>
  <text x="330" y="670" fill="#fde68a" font-family="${FONT}" font-size="14" text-anchor="end">${t("כתום = עובר סינון")}</text>
  <text x="330" y="698" fill="#9ca3af" font-family="${FONT}" font-size="14" text-anchor="end">${t("אפור = לא עובר")}</text>`,
  }),

  "filter-3-custom-times.svg": svg({
    label: "שעות מותאמות אישית",
    body: `${header()}
  <rect x="24" y="80" width="342" height="560" rx="16" fill="${PANEL}" stroke="${ORANGE}" stroke-opacity="0.25"/>
  <text x="330" y="120" fill="#fdba74" font-family="${FONT}" font-size="18" font-weight="700" text-anchor="end">${t("שעות")}</text>
  <rect x="40" y="200" width="310" height="36" rx="8" fill="${ORANGE}" fill-opacity="0.15"/>
  <text x="330" y="223" fill="#fb923c" font-family="${FONT}" font-size="14" font-weight="700" text-anchor="end">${t("● מותאם אישית")}</text>
  <rect x="56" y="250" width="278" height="70" rx="10" fill="#14081c" stroke="${ORANGE}" stroke-opacity="0.2"/>
  <text x="320" y="280" fill="#c4b5fd" font-family="${FONT}" font-size="13" text-anchor="end">${t("מ- 18:30")}</text>
  <rect x="40" y="350" width="310" height="90" rx="10" fill="#261536" stroke="#a78bfa" stroke-opacity="0.3"/>
  <text x="330" y="385" fill="#fde68a" font-family="${FONT}" font-size="13" text-anchor="end">${t("עכשיו 17:00")}</text>
  <text x="330" y="412" fill="#86efac" font-family="${FONT}" font-size="13" text-anchor="end">${t("✓ ייפתח ב-19:00 — יופיע")}</text>
  <text x="330" y="438" fill="#fca5a5" font-family="${FONT}" font-size="13" text-anchor="end">${t("✗ כבר נסגר — לא")}</text>`,
  }),

  "filter-4-results.svg": svg({
    label: "תוצאות סינון",
    body: `${header()}
  ${toolbar(true)}
  <text x="330" y="130" fill="#fdba74" font-family="${FONT}" font-size="16" font-weight="700" text-anchor="end">${t("רשימה / מסלול")}</text>
  <rect x="24" y="150" width="342" height="72" rx="12" fill="${PANEL}" stroke="${ORANGE}" stroke-opacity="0.3"/>
  <text x="330" y="195" fill="#fde68a" font-family="${FONT}" font-size="15" text-anchor="end">${t("רק בתים שעברו סינון")}</text>
  <rect x="24" y="340" width="342" height="120" rx="12" fill="#261536" stroke="#a78bfa" stroke-opacity="0.25"/>
  <text x="330" y="380" fill="#c4b5fd" font-family="${FONT}" font-size="14" font-weight="600" text-anchor="end">${t("להחזיר אפורים?")}</text>
  <text x="330" y="415" fill="#fde68a" font-family="${FONT}" font-size="13" text-anchor="end">${t("שנו סינון → הצג תוצאות")}</text>`,
  }),

  "install/ios-2-share.svg": svg({
    label: "כפתור שיתוף ב-Safari",
    body: `<rect width="390" height="780" fill="#f2f2f7"/>
  <rect y="700" width="390" height="80" fill="#e5e5ea"/>
  <rect x="175" y="720" width="40" height="40" rx="8" fill="${ORANGE}"/>
  <text x="195" y="748" fill="#fff" font-family="${FONT}" font-size="20" text-anchor="middle">&#8599;</text>
  <text x="195" y="690" fill="#333" font-family="${FONT}" font-size="13" text-anchor="middle">${t("Share")}</text>
  <path d="M195 680 L195 640" stroke="${ORANGE}" stroke-width="3" marker-end="url(#ios)"/>
  <text x="195" y="620" fill="${ORANGE}" font-family="${FONT}" font-size="14" font-weight="700" text-anchor="middle">${t("לחצו שיתוף")}</text>
  <defs><marker id="ios" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${ORANGE}"/></marker></defs>`,
  }),

  "install/ios-3-add-home.svg": svg({
    label: "הוספה למסך הבית",
    body: `<rect width="390" height="780" fill="#f2f2f7"/>
  <rect x="20" y="200" width="350" height="400" rx="16" fill="#fff"/>
  <rect x="40" y="420" width="310" height="44" rx="10" fill="#007aff" fill-opacity="0.12"/>
  <text x="195" y="448" fill="#007aff" font-family="${FONT}" font-size="16" font-weight="600" text-anchor="middle">${t("Add to Home Screen")}</text>
  <path d="M195 380 L195 340" stroke="${ORANGE}" stroke-width="3" marker-end="url(#ios2)"/>
  <text x="195" y="320" fill="${ORANGE}" font-family="${FONT}" font-size="14" font-weight="700" text-anchor="middle">${t("בחרו הוספה למסך הבית")}</text>
  <defs><marker id="ios2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${ORANGE}"/></marker></defs>`,
  }),

  "install/android-1-app.svg": svg({
    label: "אפליקציה ב-Chrome",
    body: `<rect width="390" height="780" fill="${BG}"/>
  <rect y="0" width="390" height="56" fill="#292929"/>
  <text x="195" y="36" fill="#fff" font-family="${FONT}" font-size="14" text-anchor="middle">my-hollaween-app.vercel.app</text>
  <text x="195" y="200" fill="#fb923c" font-family="${FONT}" font-size="22" font-weight="700" text-anchor="middle">HallowHood</text>`,
  }),

  "install/android-2-menu.svg": svg({
    label: "תפריט Chrome",
    body: `<rect width="390" height="780" fill="${BG}"/>
  <rect y="0" width="390" height="56" fill="#292929"/>
  <text x="350" y="36" fill="#fff" font-family="${FONT}" font-size="24" text-anchor="middle">&#8942;</text>
  <rect x="120" y="60" width="250" height="200" rx="12" fill="#fff"/>
  <text x="245" y="180" fill="#333" font-family="${FONT}" font-size="15" text-anchor="middle">${t("Add to Home screen")}</text>
  <path d="M350 50 L280 100" stroke="${ORANGE}" stroke-width="3" marker-end="url(#and)"/>
  <defs><marker id="and" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${ORANGE}"/></marker></defs>`,
  }),

  "install/android-3-confirm.svg": svg({
    label: "אישור הוספה",
    body: `<rect width="390" height="780" fill="#000" fill-opacity="0.5"/>
  <rect x="40" y="250" width="310" height="200" rx="16" fill="#fff"/>
  <text x="195" y="300" fill="#333" font-family="${FONT}" font-size="16" font-weight="700" text-anchor="middle">${t("Add to Home screen?")}</text>
  <rect x="60" y="380" width="120" height="40" rx="8" fill="#e5e5ea"/>
  <text x="120" y="406" fill="#333" font-family="${FONT}" font-size="14" text-anchor="middle">Cancel</text>
  <rect x="210" y="380" width="120" height="40" rx="8" fill="${ORANGE}"/>
  <text x="270" y="406" fill="#000" font-family="${FONT}" font-size="14" font-weight="700" text-anchor="middle">Add</text>`,
  }),
};

for (const [rel, content] of Object.entries(files)) {
  write(rel, content);
}

console.log(`Wrote ${Object.keys(files).length} SVG files to ${root}`);
