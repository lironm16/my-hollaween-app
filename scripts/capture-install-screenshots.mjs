#!/usr/bin/env node
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "help", "install");
const tmpDir = join(root, ".tmp-install-mocks");
const base = process.env.APP_URL ?? "http://127.0.0.1:43128";

mkdirSync(outDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function shot(page, name) {
  await page.screenshot({ path: join(outDir, name) });
}

async function shotHtml(name, html, viewport, deviceScaleFactor = 2) {
  const file = join(tmpDir, `${name}.html`);
  writeFileSync(file, html, "utf8");
  const page = await browser.newPage({ viewport, deviceScaleFactor, locale: "he-IL" });
  await page.goto(`file://${file}`, { waitUntil: "load" });
  await page.waitForTimeout(200);
  await shot(page, name);
  await page.close();
}

const iosSafari = devices["iPhone 13 Pro"];
const androidChrome = devices["Pixel 7"];

{
  const page = await browser.newPage({
    ...iosSafari,
    locale: "he-IL",
  });
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1500);
  await shot(page, "ios-1-app.png");
  await page.close();
}

{
  const page = await browser.newPage({
    ...androidChrome,
    locale: "he-IL",
  });
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1500);
  await shot(page, "android-1-app.png");
  await page.close();
}

const mockStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #000; }
`;

await shotHtml(
  "ios-2-share.png",
  `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"/><style>${mockStyles}
    .phone { width: 390px; height: 844px; background: linear-gradient(#1a0f24,#12081a); position: relative; overflow: hidden; }
    .safari-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 88px; background: rgba(28,28,30,.94); border-top: 1px solid #333; display: flex; align-items: center; justify-content: space-around; padding-bottom: 18px; }
    .safari-btn { color: #0a84ff; font-size: 11px; text-align: center; width: 64px; }
    .safari-btn svg { display: block; margin: 0 auto 4px; }
    .share-ring { outline: 3px solid #ff9500; border-radius: 12px; padding: 4px 2px; }
    .hint { position: absolute; top: 24px; left: 16px; right: 16px; background: rgba(255,149,0,.15); border: 1px solid rgba(255,149,0,.45); color: #ffd099; padding: 12px; border-radius: 14px; font-size: 16px; text-align: center; }
  </style></head><body><div class="phone">
    <div class="hint">לחצו על <strong>שיתוף</strong> למטה</div>
    <div class="safari-bar">
      <div class="safari-btn">◀</div>
      <div class="safari-btn">▶</div>
      <div class="safari-btn share-ring"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" stroke-width="2"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/></svg>שיתוף</div>
      <div class="safari-btn"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>דפים</div>
      <div class="safari-btn"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/></svg>טאבים</div>
    </div>
  </div></body></html>`,
  { width: 390, height: 844 },
);

await shotHtml(
  "ios-3-add-home.png",
  `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"/><style>${mockStyles}
    .phone { width: 390px; height: 844px; background: rgba(0,0,0,.35); position: relative; }
    .sheet { position: absolute; left: 0; right: 0; bottom: 0; background: #f2f2f7; border-radius: 14px 14px 0 0; padding: 12px 0 28px; color: #111; }
    .grab { width: 36px; height: 5px; background: #c7c7cc; border-radius: 99px; margin: 0 auto 12px; }
    .row { display: flex; align-items: center; gap: 12px; padding: 12px 18px; font-size: 17px; border-bottom: 1px solid #e5e5ea; }
    .row.highlight { background: #fff3e0; box-shadow: inset 0 0 0 2px #ff9500; font-weight: 600; }
    .icon { width: 28px; height: 28px; border-radius: 6px; background: #ddd; display: grid; place-items: center; font-size: 16px; }
  </style></head><body><div class="phone"><div class="sheet">
    <div class="grab"></div>
    <div class="row"><span class="icon">📋</span> העתק</div>
    <div class="row highlight"><span class="icon">➕</span> הוספה למסך הבית</div>
    <div class="row"><span class="icon">🔖</span> סימנייה</div>
    <div class="row"><span class="icon">📤</span> שליחה</div>
  </div></div></body></html>`,
  { width: 390, height: 844 },
);

await shotHtml(
  "android-2-menu.png",
  `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"/><style>${mockStyles}
    .phone { width: 390px; height: 844px; background: linear-gradient(#1a0f24,#12081a); position: relative; }
    .chrome { position: absolute; top: 0; left: 0; right: 0; height: 56px; background: #202124; display: flex; align-items: center; padding: 0 12px; gap: 8px; }
    .omni { flex: 1; height: 36px; background: #303134; border-radius: 18px; color: #e8eaed; font-size: 14px; display: flex; align-items: center; padding: 0 14px; }
    .menu-btn { width: 36px; height: 36px; border-radius: 18px; outline: 3px solid #ff9500; display: grid; place-items: center; color: #e8eaed; font-size: 22px; }
    .menu { position: absolute; top: 58px; left: 12px; width: 260px; background: #303134; border-radius: 8px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,.45); }
    .item { padding: 14px 16px; color: #e8eaed; font-size: 16px; border-bottom: 1px solid #3c4043; }
    .item.highlight { background: #3c4043; box-shadow: inset 0 0 0 2px #ff9500; font-weight: 600; }
    .hint { position: absolute; top: 72px; left: 16px; right: 16px; color: #ffd099; font-size: 16px; text-align: center; background: rgba(255,149,0,.12); border: 1px solid rgba(255,149,0,.4); padding: 10px; border-radius: 12px; }
  </style></head><body><div class="phone">
    <div class="chrome"><div class="omni">hallowhood…</div><div class="menu-btn">⋮</div></div>
    <div class="hint">לחצו על שלוש הנקודות למעלה</div>
    <div class="menu">
      <div class="item">היסטוריה</div>
      <div class="item highlight">הוסף למסך הבית</div>
      <div class="item">התקן אפליקציה</div>
      <div class="item">הגדרות</div>
    </div>
  </div></body></html>`,
  { width: 390, height: 844 },
);

await shotHtml(
  "android-3-confirm.png",
  `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"/><style>${mockStyles}
    .phone { width: 390px; height: 844px; background: rgba(0,0,0,.5); position: relative; display: grid; place-items: center; }
    .dialog { width: 320px; background: #303134; border-radius: 16px; padding: 20px; color: #e8eaed; text-align: center; }
    .icon { width: 56px; height: 56px; border-radius: 14px; margin: 0 auto 12px; background: linear-gradient(135deg,#ff7a18,#a855f7); display: grid; place-items: center; font-size: 28px; }
    h1 { font-size: 18px; margin-bottom: 8px; }
    p { font-size: 14px; color: #bdc1c6; margin-bottom: 16px; line-height: 1.4; }
    .btn { display: block; width: 100%; padding: 12px; border-radius: 10px; font-size: 16px; margin-top: 8px; border: none; }
    .primary { background: #8ab4f8; color: #202124; font-weight: 600; }
    .ghost { background: transparent; color: #8ab4f8; }
  </style></head><body><div class="phone"><div class="dialog">
    <div class="icon">🎃</div>
    <h1>הוסף למסך הבית?</h1>
    <p>HallowHood · הלואין בשכונה</p>
    <button class="btn primary">הוסף</button>
    <button class="btn ghost">ביטול</button>
  </div></div></body></html>`,
  { width: 390, height: 844 },
);

rmSync(tmpDir, { recursive: true, force: true });
await browser.close();
console.log("Wrote install screenshots to public/help/install/");
