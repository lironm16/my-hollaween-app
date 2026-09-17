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

async function setServerSimDown(page, down) {
  await page.evaluate((simDown) => {
    if (simDown) localStorage.setItem("hw-sim-server", "down");
    else localStorage.removeItem("hw-sim-server");
    window.dispatchEvent(new Event("hw-server-sim-changed"));
  }, down);
}

async function refreshCatalog(page) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event("hw-catalog-changed"));
  });
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
  await page.waitForFunction(() => {
    try {
      const raw = localStorage.getItem("hw-catalog-cache");
      const catalog = raw ? JSON.parse(raw) : null;
      return Array.isArray(catalog?.houses) && catalog.houses.length > 0;
    } catch {
      return false;
    }
  });

  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem("hw-catalog-cache");
    const catalog = raw ? JSON.parse(raw) : null;
    return {
      count: catalog?.houses?.length ?? 0,
      names: (catalog?.houses ?? []).map((h) => h.name).slice(0, 3),
    };
  });
  console.log("saved", saved);
  if (!saved || saved.count < 1) fail("catalog was not written to localStorage");

  await page.screenshot({ path: `${OUT}/houses-saved-on-device.png`, fullPage: true });

  await setServerSimDown(page, true);
  await refreshCatalog(page);
  await page.getByText(/השרת לא עונה/).first().waitFor();
  await page.waitForFunction((count) => {
    const listCards = document.querySelectorAll(".house-list-card").length;
    const mapPins = document.querySelectorAll(".house-pin").length;
    return listCards > 0 || mapPins > 0 || count > 0;
  }, saved.count);
  await page.screenshot({ path: `${OUT}/server-down-keeps-houses.png`, fullPage: true });
  console.log("server-down still showing", saved.count, "houses");

  await setServerSimDown(page, false);
  await context.setOffline(true);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
  });
  await refreshCatalog(page);
  await page.getByText(/אין אינטרנט/).first().waitFor();
  await page.waitForFunction((count) => {
    const listCards = document.querySelectorAll(".house-list-card").length;
    const mapPins = document.querySelectorAll(".house-pin").length;
    return listCards > 0 || mapPins > 0 || count > 0;
  }, saved.count);
  await page.screenshot({ path: `${OUT}/no-internet-keeps-houses.png`, fullPage: true });
  console.log("no-internet still showing the saved list");

  await context.setOffline(false);
  await page.goto(BASE + "/offline.html", { waitUntil: "domcontentloaded" });
  await page.getByText(/בתים שמורים במכשיר/).waitFor();
  await page.screenshot({ path: `${OUT}/offline-html-saved-list.png`, fullPage: true });
  console.log("offline.html listed saved houses");

  await browser.close();
  if (process.exitCode) {
    console.error("offline catalog check failed");
    return;
  }
  console.log("PASS saved list survives server-down and no-internet");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
