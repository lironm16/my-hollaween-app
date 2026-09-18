#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "help");
const base = process.env.APP_URL ?? "http://127.0.0.1:43127";

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: "he-IL",
});

await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.getByRole("button", { name: "תפריט" }).click();
await page.getByRole("button", { name: /^בית/ }).click();
await page.locator('a[href="/add"]').waitFor({ timeout: 10_000 });
await page.waitForTimeout(300);
await page.screenshot({ path: join(outDir, "step-1-menu.png") });

await page.goto(`${base}/add`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.getByRole("heading", { name: "הוספת בית אימה" }).waitFor({ timeout: 15_000 });
await page.waitForTimeout(800);
await page.screenshot({ path: join(outDir, "step-2-form.png") });

await page.getByText("שעות ב־31 באוקטובר").waitFor({ timeout: 15_000 });
await page.getByText("שעות ב־31 באוקטובר").scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await page.screenshot({ path: join(outDir, "step-3-details.png") });

await page.evaluate(() => {
  const main = document.querySelector("main");
  if (!main) return;
  main.innerHTML = `
    <div class="house-added-success space-y-4 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-400/30">
      <div class="flex flex-col items-center gap-2 text-center">
        <h1 class="font-display text-2xl text-orange-300">הבית במפה!</h1>
        <p class="text-base text-violet-100">בית משפחת לוי נשמר ומופיע במפה.</p>
      </div>
      <div class="rounded-xl bg-[#12081a] p-3 ring-1 ring-orange-500/30 text-center">
        <p class="text-sm text-violet-300">קוד עריכה</p>
        <p class="mt-1 font-mono text-3xl tracking-[0.35em] text-orange-200" dir="ltr">482916</p>
        <p class="mt-2 text-sm text-amber-200">העתיקו ושמרו — בלי הקוד אי אפשר לערוך</p>
      </div>
    </div>
  `;
});
await page.waitForTimeout(200);
await page.screenshot({ path: join(outDir, "step-3-done.png"), fullPage: true });

await browser.close();
console.log("Wrote help screenshots to public/help/");
