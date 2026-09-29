import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43127";
const OUT = process.env.E2E_ARTIFACTS_DIR ?? join(process.cwd(), "artifacts", "e2e");
const IS_CI = process.env.CI === "true" || process.env.CI === "1";

function fail(message) {
  console.error("FAIL", message);
  process.exitCode = 1;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    ...(IS_CI ? {} : { channel: "chrome" }),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "he-IL",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  page.on("pageerror", (err) => console.log("pageerror", err.message));

  await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });
  await page.getByText(/בתים/).first().waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".house-pin").length > 0);

  const saved = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem("hw-catalog-cache");
      const catalog = raw ? JSON.parse(raw) : null;
      return catalog?.houses?.length ?? 0;
    } catch {
      return -1;
    }
  });
  console.log("catalog localStorage house count", saved);
  if (saved > 0) fail("catalog must not be written to localStorage");

  await page.screenshot({ path: `${OUT}/no-device-catalog-cache.png`, fullPage: true });

  await page.goto(BASE + "/offline.html", { waitUntil: "domcontentloaded" });
  await page.getByText(/רשימת הבתים לא נשמרת/).waitFor();
  const downloadVisible = await page.locator("#download").isVisible().catch(() => false);
  if (downloadVisible) fail("offline.html must not offer download");
  await page.screenshot({ path: `${OUT}/offline-html-no-list.png`, fullPage: true });
  console.log("offline.html shows connection message only");

  await browser.close();
  if (process.exitCode) {
    console.error("offline catalog check failed");
    return;
  }
  console.log("PASS device catalog cache disabled");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
