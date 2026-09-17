import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { adminDeleteHouse, e2eHousePayload } from "./lib/e2e-house.mjs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43127";
const OUT = process.env.E2E_ARTIFACTS_DIR ?? join(process.cwd(), "artifacts", "e2e");
const IS_CI = process.env.CI === "true" || process.env.CI === "1";

let failures = 0;

function fail(message) {
  console.error("FAIL", message);
  failures += 1;
}

function pass(message) {
  console.log("ok", message);
}

async function launchBrowser() {
  return chromium.launch({
    ...(IS_CI ? {} : { channel: "chrome" }),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
}

async function waitForCatalog(page) {
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
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "he-IL",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);

  await page.goto(`${BASE}/stats`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "תמונת מצב" }).waitFor();
  pass("STATS-01 stats page shows תמונת מצב heading");

  await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });
  await waitForCatalog(page);
  await page.getByRole("button", { name: "מאיפה למדוד מרחק" }).click();
  await page.getByRole("button", { name: "מרכז השכונה" }).click();
  const origin = await page.evaluate(() => {
    const raw =
      sessionStorage.getItem("hw-distance-origin") ?? localStorage.getItem("hw-distance-origin");
    return raw ? JSON.parse(raw) : null;
  });
  if (origin?.kind !== "neighborhood") fail("ORIGIN-01 should persist neighborhood origin choice");
  else pass("ORIGIN-01 origin picker saves מרכז השכונה");

  const flushResult = await page.evaluate(
    async ({ baseUrl, housePayload }) => {
    const created = await fetch(`${baseUrl}/api/houses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(housePayload),
    });
    if (!created.ok) return { error: "create-failed" };
    const body = await created.json();
    const house = body.house;
    const editCode = body.editCode;
    if (!house?.id || !editCode) return { error: "missing-house" };

    const nextHouse = {
      ...house,
      visit: "closed",
      soldOut: true,
      treatStock: { ...house.treatStock, candy: "out" },
      updatedAt: new Date().toISOString(),
    };
    const pending = {
      id: house.id,
      method: "PATCH",
      url: `/api/houses/${encodeURIComponent(house.id)}`,
      body: { editCode, visit: "closed", treatStock: { candy: "out" } },
      house: nextHouse,
      editCode,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("hw-pending-writes", JSON.stringify([pending]));

    window.dispatchEvent(new Event("hw-catalog-changed"));
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const raw = localStorage.getItem("hw-pending-writes");
      const queue = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(queue) || queue.length === 0) break;
    }

    const remaining = localStorage.getItem("hw-pending-writes");
    const queue = remaining ? JSON.parse(remaining) : [];
    const live = await fetch(`${baseUrl}/api/houses/${encodeURIComponent(house.id)}`, {
      cache: "no-store",
    });
    const liveHouse = live.ok ? await live.json() : null;
    return {
      queueLength: Array.isArray(queue) ? queue.length : -1,
      soldOut: liveHouse?.soldOut === true,
      houseId: house.id,
    };
  },
    {
      baseUrl: BASE,
      housePayload: e2eHousePayload("בית תור E2E", { description: "בדיקת תור offline" }),
    },
  );

  if (flushResult.error) fail(`OFF-07 setup failed: ${flushResult.error}`);
  else if (flushResult.queueLength !== 0) fail("OFF-07 pending write queue should flush when online");
  else if (!flushResult.soldOut) fail("OFF-07 flushed PATCH should update house on server");
  else pass("OFF-07 offline write queue syncs to server when network is available");

  if (flushResult.houseId) {
    await adminDeleteHouse(BASE, flushResult.houseId);
  }

  await page.screenshot({ path: `${OUT}/batch4.png`, fullPage: true });
  await context.close();
  await browser.close();

  if (failures) {
    console.error(`Batch-4 E2E failed (${failures} checks)`);
    process.exit(1);
  }
  console.log("PASS batch-4 E2E");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
