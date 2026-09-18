#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "help");
const base = process.env.APP_URL ?? "http://127.0.0.1:43128";

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: "he-IL",
});

await page.goto(`${base}/add`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator('[aria-label="תפריט"]').click();
await page.getByText("מסך הבית").waitFor({ timeout: 10_000 });
await page.waitForTimeout(400);
await page.screenshot({ path: join(outDir, "step-1-menu.png") });

await page.goto(`${base}/add`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.locator("form").waitFor({ timeout: 15_000 });
await page.waitForTimeout(1200);
const addressClip = await page.evaluate(() => {
  const sections = document.querySelectorAll("form section");
  const home = sections[0];
  const where = sections[1];
  if (!home || !where) return null;
  const top = home.getBoundingClientRect().top;
  const bottom = where.getBoundingClientRect().bottom;
  const height = bottom - top + 8;
  if (height <= 1) return null;
  return {
    x: 0,
    y: Math.max(0, top - 4),
    width: document.documentElement.clientWidth,
    height,
  };
});
if (addressClip && addressClip.height > 1) {
  await page.screenshot({ path: join(outDir, "step-2-form.png"), clip: addressClip });
} else {
  await page.getByText("שם הבית").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(outDir, "step-2-form.png") });
}

await page.getByText("מתי פתוחים").scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
const detailsClip = await page.evaluate(() => {
  const sections = [...document.querySelectorAll("form section")];
  const hoursSection = sections.find((s) => s.querySelector("h2")?.textContent?.trim() === "מתי פתוחים");
  const traitsSection = sections.find((s) => s.querySelector("h2")?.textContent?.trim() === "מה יפגשו בבית");
  const start = hoursSection ?? traitsSection;
  const end = traitsSection ?? hoursSection;
  if (!start || !end) return null;
  const top = start.getBoundingClientRect().top;
  const bottom = end.getBoundingClientRect().bottom;
  const height = bottom - top + 8;
  if (height <= 0) return null;
  return {
    x: 0,
    y: Math.max(0, top - 4),
    width: document.documentElement.clientWidth,
    height,
  };
});
if (detailsClip && detailsClip.height > 1) {
  await page.screenshot({ path: join(outDir, "step-3-details.png"), clip: detailsClip });
} else {
  await page.getByText("שעות ב־31 באוקטובר").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(outDir, "step-3-details.png"), fullPage: false });
}

await page.evaluate(() => {
  const main = document.querySelector("main");
  if (!main) return;
  main.innerHTML = `
    <div class="house-added-success space-y-4 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-400/30">
      <div class="flex flex-col items-center gap-2 text-center">
        <h1 class="font-display text-2xl text-orange-300">הבית במפה!</h1>
        <p class="text-base text-orange-100">בית משפחת לוי נשמר ומופיע במפה.</p>
      </div>
      <div class="rounded-xl bg-[#12081a] p-3 ring-1 ring-orange-500/30 text-center">
        <p class="text-base text-orange-200">קוד עריכה</p>
        <p class="mt-1 font-mono text-3xl tracking-[0.35em] text-orange-200" dir="ltr">482916</p>
      </div>
    </div>
  `;
});
await page.waitForTimeout(200);
await page.screenshot({ path: join(outDir, "step-3-done.png") });

await browser.close();
console.log("Wrote help screenshots to public/help/");
