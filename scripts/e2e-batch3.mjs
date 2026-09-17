import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  firstRealHouseId,
  openHouseByFocus,
  skipHouseFromDetail,
  waitForCatalog,
} from "./lib/e2e-helpers.mjs";

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

async function openFilterSheet(page) {
  await page.getByRole("button", { name: /^סינון/ }).first().click();
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

  await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });
  await waitForCatalog(page);
  const likeHouseId = await firstRealHouseId(page);
  const detail = await openHouseByFocus(page, BASE, likeHouseId);
  await detail.getByRole("button", { name: "פעולות" }).click();
  await page.getByRole("menuitem", { name: "אהבתי" }).click();
  await page.getByText("שמרתם!").waitFor();
  await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });
  await waitForCatalog(page);
  await page.getByRole("button", { name: "מפה", exact: true }).click();

  const dimBefore = await page.locator(".is-filter-dim .is-filtered-out").count();
  await openFilterSheet(page);
  await page.getByText("שמורים", { exact: true }).click();
  await page.getByRole("button", { name: /הצג תוצאות/ }).click();
  await page.getByRole("button", { name: /סינון \(1\)/ }).first().waitFor();
  const dimAfter = await page.locator(".is-filter-dim .is-filtered-out").count();
  if (dimAfter <= dimBefore) fail("MAP-05 active filter should dim non-matching map pins");
  else pass("MAP-05 filter dims non-matching pins on the map");

  const multiUnitCount = await page.evaluate(() => {
    const houses = JSON.parse(localStorage.getItem("hw-catalog-cache") ?? "{}").houses ?? [];
    const counts = new Map();
    for (const house of houses) {
      counts.set(house.address, (counts.get(house.address) ?? 0) + 1);
    }
    return Math.max(0, ...counts.values(), 0);
  });
  if (multiUnitCount < 2) fail("MAP-03 catalog should include a multi-unit address");
  else pass("MAP-03 catalog includes multi-unit address data");

  const skipHouseId = await firstRealHouseId(page);
  const skipDetail = await openHouseByFocus(page, BASE, skipHouseId);
  const skippedName = await skipDetail.locator(".sr-only").first().innerText().catch(() => "");
  const { skippedBefore, skippedAfter } = await skipHouseFromDetail(page, skipDetail);
  const newlySkipped = skippedAfter.some((id) => !skippedBefore.includes(id));
  if (!newlySkipped) fail("MAP-10 skip should persist in localStorage");
  else pass("MAP-10 skip saves to localStorage");
  await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });

  await page.goto(`${BASE}/skipped-houses`, { waitUntil: "domcontentloaded" });
  if (skippedName) {
    await page.getByText(skippedName, { exact: false }).first().waitFor();
  } else {
    await page.getByText("דילגתי").waitFor();
  }
  pass("MAP-10 skipped house appears on skipped page");
  await page.getByRole("button", { name: "החזרת כל הבתים" }).click();
  await page.getByText("אין בתים שדילגתם עליהם.").waitFor();
  pass("EXP-03 skipped houses page can restore all houses");

  const restoreHouseId = skippedAfter.find((id) => !skippedBefore.includes(id));
  if (restoreHouseId) {
    await page.evaluate((houseId) => {
      localStorage.setItem("hw-skipped-houses", JSON.stringify([houseId]));
      localStorage.setItem(
        "hw-skipped-meta",
        JSON.stringify({
          [houseId]: {
            reason: "candy-out",
            temporary: true,
            restoreTriggers: ["candy-out"],
            statusKey: "open|ok|ok|open|out",
            skippedAt: new Date().toISOString(),
          },
        }),
      );
    }, restoreHouseId);
    await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });
    await waitForCatalog(page);
    await page.getByRole("status").filter({ hasText: "חזר לרשימה" }).first().waitFor();
    pass("MAP-11 temporary skip restore alert is shown");
  } else {
    fail("MAP-11 could not seed a skipped house for restore alert");
  }

  await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });
  await waitForCatalog(page);
  await page.evaluate(() => {
    localStorage.removeItem("hw-liked-houses");
    localStorage.removeItem("hw-visited-houses");
    localStorage.removeItem("hw-house-filters");
    localStorage.removeItem("hw-house-filters-version");
    window.dispatchEvent(new Event("hw-liked-changed"));
    window.dispatchEvent(new Event("hw-visited-changed"));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForCatalog(page);
  const routeHouseId = await firstRealHouseId(page);
  const routeDetail = await openHouseByFocus(page, BASE, routeHouseId);
  const routeHouseName = await routeDetail.locator(".sr-only").first().innerText().catch(() => "");
  await routeDetail.getByRole("button", { name: "פעולות" }).click();
  await page.getByRole("menuitem", { name: "אהבתי" }).click();
  await page.getByText("שמרתם!").waitFor();
  await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });
  await waitForCatalog(page);
  await openFilterSheet(page);
  await page.getByText("שמורים", { exact: true }).click();
  await page.getByRole("button", { name: /הצג תוצאות/ }).click();
  await page.getByRole("button", { name: /סינון \(1\)/ }).first().waitFor();
  await page.getByRole("button", { name: "מסלול" }).click();
  await page.getByRole("button", { name: "רשימה" }).click();
  const routeCards = await page.locator(".route-list-card").count();
  if (routeCards > 3) fail("ROUTE-02 route should respect the liked-only filter");
  else pass("ROUTE-02 route respects active filters");
  if (routeHouseName) {
    const routeText = await page.locator(".route-list").innerText();
    if (!routeText.includes(routeHouseName.split("\n")[0])) {
      fail("ROUTE-02 route list should include the filtered liked house");
    }
  }
  await page.locator(".route-list-house").first().click();
  const visitDetail = page.getByRole("dialog");
  await visitDetail.getByRole("button", { name: "פעולות" }).click();
  await page.getByRole("menuitem", { name: "ביקרתי" }).click();
  await page.getByText("סיימתם את המסלול!").waitFor();
  pass("ROUTE-04 route completion cheer appears after visiting all stops");
  await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });

  const ownedHouse = await page.evaluate(() => {
    const raw = localStorage.getItem("hw-catalog-cache");
    const catalog = raw ? JSON.parse(raw) : null;
    const house = catalog?.houses?.[0];
    if (!house) return null;
    const owned = { id: house.id, name: house.name, editCode: "123456", preview: house };
    localStorage.setItem("hw-my-houses", JSON.stringify([owned]));
    window.dispatchEvent(new Event("hw-owned-changed"));
    return house.name;
  });
  if (!ownedHouse) fail("MY-01 should seed an owned house from catalog");
  else {
    await page.goto(`${BASE}/my-houses`, { waitUntil: "domcontentloaded" });
    await page.getByText(ownedHouse).first().waitFor();
    pass("MY-01 my-houses page lists device-owned houses");
  }

  await page.screenshot({ path: `${OUT}/batch3.png`, fullPage: true });
  await context.close();
  await browser.close();

  if (failures) {
    console.error(`Batch-3 E2E failed (${failures} checks)`);
    process.exit(1);
  }
  console.log("PASS batch-3 E2E");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
