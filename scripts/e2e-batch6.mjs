import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  adminDeleteHouse,
  createE2eHouse,
  E2E_HOUSE_ADDRESS,
} from "./lib/e2e-house.mjs";
import { openHouseByFocus, waitForCatalog } from "./lib/e2e-helpers.mjs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43127";
const OUT = process.env.E2E_ARTIFACTS_DIR ?? join(process.cwd(), "artifacts", "e2e");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "pumpkin2026";
const IS_CI = process.env.CI === "true" || process.env.CI === "1";

let failures = 0;
const createdHouseIds = [];

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

async function gotoPage(page, url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await page.waitForTimeout(400);
    }
  }
}

async function openSideMenu(page) {
  await page.getByRole("button", { name: "תפריט" }).click();
}

async function fillAddHouseForm(page, { name, address = E2E_HOUSE_ADDRESS }) {
  await page.getByPlaceholder(/בית משפחת/).fill(name);
  const addressField = page.getByPlaceholder(/רחוב ומספר/);
  await addressField.fill("");
  await addressField.fill(address);
  await page.waitForFunction(
    () => document.querySelectorAll('[role="listbox"] button').length > 0,
    null,
    { timeout: 15_000 },
  );
  await page.getByRole("listbox").getByRole("button").first().click();
  await page.getByText("כתובת מאומתת על המפה").waitFor();
  await page.getByPlaceholder(/קומה|דירה|הוראות/).fill("קומה 1");
  await page.locator("button", { hasText: "לילדים" }).first().click();
}

async function seedOwnedHouse(page, house, editCode) {
  await page.evaluate(
    ({ house, editCode }) => {
      localStorage.setItem("hw-rehearsal-scene", "open");
      localStorage.setItem(
        "hw-my-houses",
        JSON.stringify([{ id: house.id, name: house.name, editCode, preview: house }]),
      );
      window.dispatchEvent(new Event("hw-owned-changed"));
      window.dispatchEvent(new Event("hw-clock-changed"));
    },
    { house, editCode },
  );
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "he-IL",
    geolocation: { latitude: 32.0912, longitude: 34.8031 },
    permissions: ["geolocation", "clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);

  await gotoPage(page, `${BASE}/add`);
  await page.getByPlaceholder(/רחוב ומספר/).fill("סין 999");
  await page.getByText("אין כתובת כזו בשכונה").waitFor();
  pass("ADD-02 invalid address shows neighborhood validation hint");

  let addedHouse = null;
  for (let attempt = 0; attempt < 2 && !addedHouse?.id; attempt += 1) {
    await gotoPage(page, `${BASE}/add`);
    const addName = `בית UI batch6 ${Date.now()}`;
    try {
      await fillAddHouseForm(page, { name: addName });
      await page.getByRole("button", { name: "שמירה" }).click();
      await page.getByRole("heading", { name: "הבית במפה!" }).waitFor({ timeout: 25_000 });
      addedHouse = await page.evaluate(() => {
        const code = document.querySelector(".font-mono")?.textContent?.trim() ?? "";
        const link = document.querySelector('a[href*="focus="]')?.getAttribute("href") ?? "";
        const id = /focus=([^&]+)/.exec(link)?.[1] ?? "";
        return { id: decodeURIComponent(id), editCode: code };
      });
    } catch {
      addedHouse = null;
    }
  }
  if (!addedHouse?.id || addedHouse.editCode.length !== 6) {
    fail("ADD-01 add-house UI should show edit code and map link");
  } else {
    createdHouseIds.push(addedHouse.id);
    pass("ADD-01 add-house UI publishes a new house");
  }

  const owned = await createE2eHouse(BASE, "בית edit batch6");
  if (!owned) fail("EDIT-01 setup could not create a test house");
  else {
    createdHouseIds.push(owned.house.id);
    await gotoPage(page, `${BASE}/my-houses?rehearsal=open`);
    await seedOwnedHouse(page, owned.house, owned.editCode);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByText(owned.house.name).first().waitFor();
    await page.getByRole("button", { name: "פעולות" }).first().click();
    await page.getByRole("menuitem", { name: "ערוך בית" }).click();
    await page.locator(".house-edit-modal").getByRole("combobox").first().waitFor();
    const candySelect = page.locator(".house-edit-modal").getByRole("combobox").first();
    await candySelect.click();
    await page.getByRole("option", { name: "מעט" }).click();
    await page.locator(".house-edit-modal").getByRole("button", { name: "שמירה" }).click();
    await page.getByText("נשמר").waitFor();
    const live = await fetch(`${BASE}/api/houses/${encodeURIComponent(owned.house.id)}`, {
      cache: "no-store",
    });
    const liveHouse = live.ok ? await live.json() : null;
    if (liveHouse?.treatStock?.candy !== "low") fail("EDIT-01 quick update should persist candy stock online");
    else pass("EDIT-01 owner quick update saves online");

    await page.getByRole("button", { name: "פעולות" }).first().click();
    await page.getByRole("menuitem", { name: "ערוך בית" }).click();
    await page.locator(".house-edit-modal").waitFor();
    await page.getByRole("button", { name: "עריכה מלאה" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "מחיקת הבית מהמפה" }).click();
    await page.getByText("הבית נמחק מהמפה").waitFor();
    const gone = await fetch(`${BASE}/api/houses/${encodeURIComponent(owned.house.id)}`, {
      cache: "no-store",
    });
    if (gone.ok) fail("EDIT-04 delete should remove house from public API");
    else pass("EDIT-04 owner can delete house from full edit");
    const idx = createdHouseIds.indexOf(owned.house.id);
    if (idx >= 0) createdHouseIds.splice(idx, 1);
  }

  await gotoPage(page, `${BASE}/admin`);
  await page.getByRole("heading", { name: "כניסת מנהל" }).waitFor();
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "כניסה למפה" }).click();
  await page.getByText("נכנסתם כמנהלים").waitFor();
  await openSideMenu(page);
  await page.getByRole("link", { name: "התראות לשכונה" }).waitFor();
  pass("ADM-01 admin login exposes admin menu links");

  const exportResult = await page.evaluate(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/admin/export?format=csv`, { credentials: "include" });
    const body = await res.text();
    return { ok: res.ok, hasHeader: body.includes("שם") && body.includes("ממתקים") };
  }, BASE);
  if (!exportResult.ok || !exportResult.hasHeader) fail("ADM-08 admin CSV export should return Hebrew headers");
  else pass("ADM-08 admin CSV export is available after login");

  await page.getByRole("button", { name: "יציאה" }).click();
  await page.getByText("יצאתם ממצב מנהל").waitFor();
  await openSideMenu(page);
  await page.getByRole("link", { name: "כניסת מנהל" }).waitFor();
  pass("ADM-09 admin logout returns guest menu");

  await gotoPage(page, `${BASE}/?rehearsal=open`);
  await waitForCatalog(page);
  const shareTarget = await page.evaluate(() => {
    const houses = JSON.parse(localStorage.getItem("hw-catalog-cache") ?? "{}").houses ?? [];
    return houses.find((house) => house.name && !/batch6|E2E/i.test(house.name)) ?? houses[0];
  });
  if (!shareTarget) fail("SHARE-01 could not pick a catalog house");
  else {
    const detail = await openHouseByFocus(page, BASE, shareTarget.id);
    await detail.getByRole("button", { name: "פעולות" }).click();
    await page.getByRole("menuitem", { name: "שתף" }).click();
    await page.getByText("הקישור הועתק").waitFor();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    const expectedPath = `/house/${encodeURIComponent(shareTarget.id)}`;
    if (!clipboard.includes(expectedPath)) fail("SHARE-01 share copies house page URL to clipboard");
    else pass("SHARE-01 share action copies the house URL");
    await page.keyboard.press("Escape");
  }

  await gotoPage(page, `${BASE}/?rehearsal=open`);
  await waitForCatalog(page);
  await page.getByRole("button", { name: "רשימה" }).click();
  const hasDistance = await page.getByText(/\d+ מ׳/).first().isVisible().catch(() => false);
  if (!hasDistance) fail("MAP-04 list view should show distance from origin");
  else pass("MAP-04 list view sorts houses with distance labels");

  await gotoPage(page, `${BASE}/?rehearsal=open`);
  await waitForCatalog(page);
  await page.getByRole("button", { name: "רשימה" }).click();
  await page.getByRole("button", { name: "שמירה" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "שמירה לקובץ" }).click(),
  ]);
  const fileName = download.suggestedFilename();
  if (!fileName.startsWith("hallowhood-") || !fileName.endsWith(".xlsx")) {
    fail("EXP-01 export should download an .xlsx list file");
  } else pass("EXP-01 list export downloads spreadsheet");

  await gotoPage(page, `${BASE}/?rehearsal=open`);
  await waitForCatalog(page);
  const charozimCount = await page.evaluate(() => {
    const houses = JSON.parse(localStorage.getItem("hw-catalog-cache") ?? "{}").houses ?? [];
    return houses.filter((house) => String(house.address ?? "").includes("חרוזים 8")).length;
  });
  if (charozimCount !== 3) fail(`CLUSTER-01 catalog should have 3 houses at חרוזים 8 (got ${charozimCount})`);
  else {
    await page.getByRole("button", { name: "מפה", exact: true }).click();
    await page.waitForTimeout(1500);
    const clusterPin = page.locator(".house-pin.is-building").first();
    if (!(await clusterPin.count())) fail("CLUSTER-01 map should render multi-unit building pin");
    else {
      await clusterPin.evaluate((el) => {
        el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      });
      const overviewText = await page
        .getByText(/\d+ בתים/)
        .first()
        .innerText()
        .catch(() => "");
      if (!overviewText.includes("3 בתים")) {
        fail(`CLUSTER-01 multi-unit overview should show 3 houses, got "${overviewText}"`);
      } else if (overviewText.includes("5 בתים")) {
        fail("CLUSTER-01 should not count rehearsal stubs at the same address");
      } else pass("CLUSTER-01 real-mode cluster shows 3 units at חרוזים 8");
    }
  }

  for (const houseId of [...new Set(createdHouseIds)]) {
    await adminDeleteHouse(BASE, houseId);
  }

  await page.screenshot({ path: `${OUT}/batch6.png`, fullPage: true });
  await context.close();
  await browser.close();

  if (failures) {
    console.error(`Batch-6 E2E failed (${failures} checks)`);
    process.exit(1);
  }
  console.log("PASS batch-6 E2E");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
