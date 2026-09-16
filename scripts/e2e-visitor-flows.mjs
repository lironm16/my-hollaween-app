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

  const firstName = await page.evaluate(() => {
    const raw = localStorage.getItem("hw-catalog-cache");
    const catalog = raw ? JSON.parse(raw) : null;
    return catalog?.houses?.[0]?.name ?? null;
  });
  if (!firstName) fail("MAP-01 catalog should include at least one house");
  else pass("MAP-01 map loads with cached houses");

  await page.getByRole("button", { name: "רשימה" }).click();
  await page.getByRole("button", { name: "רשימה", pressed: true }).waitFor();
  await page.getByRole("button", { name: "מפה" }).click();
  await page.getByRole("button", { name: "מפה", pressed: true }).waitFor();
  pass("MAP-04 toggles between list and map views");

  await page.getByRole("button", { name: "רשימה" }).click();
  if (firstName) {
    await page.getByRole("button", { name: "פתיחת פרטי הבית" }).first().click();
    try {
      await page.getByRole("button", { name: "פעולות" }).first().waitFor({ timeout: 5_000 });
      pass("MAP-02 list row opens house detail overlay");
    } catch {
      fail("MAP-02 house selection should open a house card with actions");
    }
    await page.getByRole("button", { name: "סגירה" }).click();
  }

  await page.getByRole("button", { name: "סינון" }).click();
  await page.getByText("פתוחים עכשיו").click();
  await page.getByRole("button", { name: /הצג תוצאות/ }).click();
  await page.getByRole("button", { name: /סינון \(1\)|סינון/ }).first().waitFor();
  pass("MAP-06 open-now filter can be applied in rehearsal mode");

  await page.getByRole("button", { name: "מסלול" }).click();
  await page.getByRole("button", { name: "יציאה מהמסלול", pressed: true }).waitFor();
  await page.getByText(/נקודת התחלה|עצירות/).first().waitFor();
  pass("ROUTE-01 route mode shows route controls");
  await page.getByRole("button", { name: "יציאה מהמסלול" }).click();

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
