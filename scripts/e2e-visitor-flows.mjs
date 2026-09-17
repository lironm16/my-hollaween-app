import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

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

async function catalogHouseIds(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("hw-catalog-cache");
    const catalog = raw ? JSON.parse(raw) : null;
    return (catalog?.houses ?? []).map((house) => house.id);
  });
}

async function readStorageIds(page, key) {
  return page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids : [];
  }, key);
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

  const firstHouse = await page.evaluate(() => {
    const raw = localStorage.getItem("hw-catalog-cache");
    const catalog = raw ? JSON.parse(raw) : null;
    const house = catalog?.houses?.[0];
    return house ? { id: house.id, name: house.name } : null;
  });
  if (!firstHouse) fail("MAP-01 catalog should include at least one house");
  else pass("MAP-01 map loads with cached houses");

  await page.getByRole("button", { name: "רשימה" }).click();
  await page.getByRole("button", { name: "רשימה", pressed: true }).waitFor();
  await page.getByRole("button", { name: "מפה" }).click();
  await page.getByRole("button", { name: "מפה", pressed: true }).waitFor();
  pass("MAP-04 toggles between list and map views");

  await page.goto(`${BASE}/?focus=${encodeURIComponent(firstHouse.id)}&rehearsal=open`, {
    waitUntil: "domcontentloaded",
  });
  await waitForCatalog(page);
  const detail = page.getByRole("dialog");
  try {
    await detail.getByRole("button", { name: "פעולות" }).waitFor({ timeout: 5_000 });
    pass("MAP-02 focus selection opens house detail overlay");
  } catch {
    fail("MAP-02 house selection should open a house card with actions");
  }

  const likedBefore = await readStorageIds(page, "hw-liked-houses");
  await detail.getByRole("button", { name: "פעולות" }).click();
  await page.getByRole("menuitem", { name: "אהבתי" }).click();
  await page.getByText("שמרתם!").waitFor();
  const likedAfter = await readStorageIds(page, "hw-liked-houses");
  const newlyLiked = likedAfter.some((id) => !likedBefore.includes(id));
  if (!newlyLiked) fail("MAP-07 like should persist in localStorage");
  else pass("MAP-07 like saves to localStorage");

  const visitedBefore = await readStorageIds(page, "hw-visited-houses");
  await detail.getByRole("button", { name: "פעולות" }).click();
  await page.getByRole("menuitem", { name: "ביקרתי" }).click();
  await page.getByText("כל הכבוד!").waitFor();
  const visitedAfter = await readStorageIds(page, "hw-visited-houses");
  const newlyVisited = visitedAfter.some((id) => !visitedBefore.includes(id));
  if (!newlyVisited) fail("MAP-08 visit should persist in localStorage");
  else pass("MAP-08 visit saves to localStorage");

  await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });
  await waitForCatalog(page);

  await openFilterSheet(page);
  await page.getByText("שמורים", { exact: true }).click();
  await page.getByRole("button", { name: /הצג תוצאות/ }).click();
  await page.getByRole("button", { name: /סינון \(1\)/ }).first().waitFor();
  pass("MAP-09 liked-only quick filter can be applied");

  await openFilterSheet(page);
  await page.getByText("פתוחים עכשיו").click();
  await page.getByRole("button", { name: /הצג תוצאות/ }).click();
  await page.getByRole("button", { name: /סינון/ }).first().waitFor();
  pass("MAP-06 open-now filter can be applied in rehearsal mode");

  await page.goto(`${BASE}/?rehearsal=open`, { waitUntil: "domcontentloaded" });
  await waitForCatalog(page);
  const allIds = await catalogHouseIds(page);
  await page.evaluate((ids) => {
    localStorage.setItem("hw-visited-houses", JSON.stringify(ids));
    window.dispatchEvent(new Event("hw-visited-changed"));
  }, allIds);
  await openFilterSheet(page);
  await page.getByText("לא ביקרתי", { exact: true }).click();
  await page.getByRole("button", { name: /הצג תוצאות/ }).click();
  await page.getByRole("button", { name: "מסלול" }).click();
  await page.getByRole("button", { name: "רשימה" }).click();
  await page.getByText("אין עצירות במסלול").waitFor();
  pass("ROUTE-03 route is empty when every house is visited");
  await page.getByRole("button", { name: "יציאה מהמסלול" }).click();

  await page.getByRole("button", { name: "מסלול" }).click();
  await page.getByRole("button", { name: "יציאה מהמסלול", pressed: true }).waitFor();
  await page.getByText(/נקודת התחלה|עצירות/).first().waitFor();
  pass("ROUTE-01 route mode shows route controls");
  await page.getByRole("button", { name: "יציאה מהמסלול" }).click();

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await waitForCatalog(page);
  const skipLink = page.getByRole("button", { name: "דלג לרשימת הבתים" });
  await skipLink.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "רשימה", pressed: true }).waitFor();
  pass("A11Y-01 skip link opens list view");

  if (firstHouse?.name) {
    await page.goto(`${BASE}/search`, { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("הקלידו שם משפחה או כתובת").fill(firstHouse.name.slice(0, 6));
    await page.getByText(firstHouse.name).first().click();
    await page.getByRole("button", { name: "פעולות" }).first().waitFor();
    pass("EXP-02 search page opens selected house");
  }

  await page.screenshot({ path: `${OUT}/visitor-flows.png`, fullPage: true });
  await context.close();

  const freshContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "he-IL",
  });
  const freshPage = await freshContext.newPage();
  freshPage.setDefaultTimeout(20_000);
  await freshPage.goto(`${BASE}/offline.html`, { waitUntil: "domcontentloaded" });
  await freshPage.getByText(/אין עותק שמור בטלפון/).waitFor();
  pass("OFF-04 offline.html without cache shows empty-state message");
  await freshContext.close();

  await browser.close();

  if (failures) {
    console.error(`Visitor-flow E2E failed (${failures} checks)`);
    process.exit(1);
  }
  console.log("PASS visitor-flow E2E");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
